import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const EMPTY_MESSAGES = [];

const ROOMS = [
  { id: 'general', name: 'General', description: 'Everyone hangs out here.' },
  { id: 'dev', name: 'Dev', description: 'Code talk and product ideas.' },
  { id: 'random', name: 'Random', description: 'Memes, links, and side quests.' },
  { id: 'support', name: 'Support', description: 'Help each other out fast.' },
];

function formatMessageTime(timestamp) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatDateLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateString = date.toDateString();
  if (dateString === today.toDateString()) return 'Today';
  if (dateString === yesterday.toDateString()) return 'Yesterday';

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function Chat() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const { socket, emit } = useSocket(token);
  const [activeRoom, setActiveRoom] = useState(ROOMS[0].id);
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [message, setMessage] = useState('');
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const roomMessages = messagesByRoom[activeRoom] ?? EMPTY_MESSAGES;
  const currentRoom = ROOMS.find((room) => room.id === activeRoom) || ROOMS[0];
  const roomOnlineUsers = onlineUsers.filter((onlineUser) => onlineUser.room === activeRoom);
  const activeTypingUsers = Object.values(typingUsers).filter(
    (entry) => entry.room === activeRoom && entry.username !== user.username,
  );

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();

    async function loadMessages() {
      setRoomLoading(true);
      setRoomError('');

      try {
        const response = await fetch(`${API_URL}/messages/${activeRoom}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load messages');
        }

        setMessagesByRoom((current) => ({
          ...current,
          [activeRoom]: data.messages || [],
        }));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setRoomError(error.message || 'Failed to load messages');
        }
      } finally {
        if (!controller.signal.aborted) {
          setRoomLoading(false);
        }
      }
    }

    loadMessages();
    return () => controller.abort();
  }, [activeRoom, token]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleConnect = () => {
      socket.emit('join-room', activeRoom);
    };

    const handleNewMessage = (incomingMessage) => {
      setMessagesByRoom((current) => {
        const roomMessagesForMessage = current[incomingMessage.room] || [];
        if (roomMessagesForMessage.some((entry) => entry._id === incomingMessage._id)) {
          return current;
        }

        return {
          ...current,
          [incomingMessage.room]: [...roomMessagesForMessage, incomingMessage],
        };
      });
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleTyping = (payload) => {
      setTypingUsers((current) => {
        const next = { ...current };

        if (payload.isTyping) {
          next[payload.username] = payload;
        } else {
          delete next[payload.username];
        }

        return next;
      });
    };

    const handleSocketError = (payload) => {
      setRoomError(payload?.message || 'Socket error');
    };

    socket.on('connect', handleConnect);
    socket.on('new-message', handleNewMessage);
    socket.on('online-users', handleOnlineUsers);
    socket.on('user-typing', handleTyping);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('new-message', handleNewMessage);
      socket.off('online-users', handleOnlineUsers);
      socket.off('user-typing', handleTyping);
      socket.off('error', handleSocketError);
    };
  }, [activeRoom, socket]);

  useEffect(() => {
    emit('join-room', activeRoom);
  }, [activeRoom, emit]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [roomMessages, activeTypingUsers.length]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMessageChange = (event) => {
    const nextMessage = event.target.value;
    setMessage(nextMessage);

    emit('typing', { room: activeRoom, isTyping: true });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emit('typing', { room: activeRoom, isTyping: false });
    }, 1200);
  };

  const handleSendMessage = (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    emit('send-message', {
      room: activeRoom,
      content: trimmedMessage,
    });
    emit('typing', { room: activeRoom, isTyping: false });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setMessage('');
  };

  let previousDateLabel = '';

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">ChatVerse</div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-title">Rooms</p>
          <ul className="room-list">
            {ROOMS.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className={`room-item ${room.id === activeRoom ? 'active' : ''}`}
                  onClick={() => setActiveRoom(room.id)}
                >
                  <span className="room-icon">#</span>
                  <span>{room.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section online-section">
          <p className="sidebar-section-title">Online Now</p>
          <div className="online-user-list">
            {onlineUsers.length === 0 ? (
              <p className="empty-sidebar-copy">Nobody is online yet.</p>
            ) : (
              onlineUsers.map((onlineUser) => (
                <div key={onlineUser._id} className="online-user-item">
                  <UserAvatar
                    username={onlineUser.username}
                    color={onlineUser.avatarColor}
                    size="small"
                    showStatus
                  />
                  <div className="online-user-meta">
                    <p className="online-user-name">{onlineUser.username}</p>
                    <p className="online-user-room">{onlineUser.room}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-profile">
          <UserAvatar username={user.username} color={user.avatarColor} />
          <div className="sidebar-profile-info">
            <p className="sidebar-profile-name">{user.username}</p>
            <p className="sidebar-profile-status">Signed in</p>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="chat-window">
        <header className="chat-header">
          <div className="chat-header-info">
            <span className="chat-header-icon">#</span>
            <div>
              <h1 className="chat-header-title">{currentRoom.name}</h1>
              <p className="chat-header-subtitle">{currentRoom.description}</p>
            </div>
          </div>
          <div className="chat-online-count">
            <span className="online-dot" />
            <span>{roomOnlineUsers.length} in room</span>
          </div>
        </header>

        <section className="messages-container">
          {roomLoading ? (
            <div className="empty-messages">
              <div className="loading-spinner" />
              <p className="empty-subtitle">Loading conversation...</p>
            </div>
          ) : roomError ? (
            <div className="empty-messages">
              <p className="empty-title">We could not load this room</p>
              <p className="empty-subtitle">{roomError}</p>
            </div>
          ) : roomMessages.length === 0 ? (
            <div className="empty-messages">
              <div className="empty-icon">#</div>
              <p className="empty-title">No messages yet</p>
              <p className="empty-subtitle">Start the conversation in {currentRoom.name}.</p>
            </div>
          ) : (
            roomMessages.map((entry) => {
              const isOwnMessage = entry.sender?._id === user._id;
              const dateLabel = formatDateLabel(entry.createdAt);
              const showDateLabel = dateLabel !== previousDateLabel;
              previousDateLabel = dateLabel;

              return (
                <div key={entry._id}>
                  {showDateLabel ? (
                    <div className="date-separator">
                      <span>{dateLabel}</span>
                    </div>
                  ) : null}

                  <article className={`message-group ${isOwnMessage ? 'own' : ''}`}>
                    <UserAvatar
                      username={entry.sender?.username}
                      color={entry.sender?.avatarColor}
                      size="small"
                    />
                    <div className="message-content-wrapper">
                      {!isOwnMessage ? (
                        <p className="message-sender">{entry.sender?.username}</p>
                      ) : null}
                      <div className="message-bubble">{entry.content}</div>
                      <p className="message-time">{formatMessageTime(entry.createdAt)}</p>
                    </div>
                  </article>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </section>

        <div className="typing-indicator">
          {activeTypingUsers.length > 0 ? (
            <>
              <div className="typing-dots">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <span>
                {activeTypingUsers.map((entry) => entry.username).join(', ')}
                {' '}
                typing...
              </span>
            </>
          ) : null}
        </div>

        <form className="message-input-container" onSubmit={handleSendMessage}>
          <div className="message-input-wrapper">
            <input
              className="message-input"
              type="text"
              value={message}
              onChange={handleMessageChange}
              placeholder={`Message #${currentRoom.id}`}
              maxLength={2000}
            />
            <button type="submit" className="send-btn" disabled={!message.trim()}>
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
