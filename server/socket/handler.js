const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const { JWT_SECRET } = require('../middleware/auth');
const { normalizeRoom } = require('../constants/rooms');

const onlineUsers = new Map();

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        _id: user._id.toString(),
        username: user.username,
        avatarColor: user.avatarColor,
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] ${socket.user.username} connected (${socket.id})`);

    onlineUsers.set(socket.id, {
      ...socket.user,
      room: 'general',
    });

    socket.join('general');
    broadcastOnlineUsers(io);

    socket.on('join-room', (room) => {
      const currentRoom = onlineUsers.get(socket.id)?.room;
      const nextRoom = normalizeRoom(room);

      if (currentRoom) {
        socket.leave(currentRoom);
      }

      socket.join(nextRoom);

      const userData = onlineUsers.get(socket.id);
      if (userData) {
        userData.room = nextRoom;
        onlineUsers.set(socket.id, userData);
      }

      broadcastOnlineUsers(io);
      console.log(`[room] ${socket.user.username} joined ${nextRoom}`);
    });

    socket.on('send-message', async (data) => {
      try {
        const content = data?.content?.trim();
        const room = normalizeRoom(data?.room);

        if (!content) return;

        const message = await Message.create({
          sender: socket.user._id,
          content,
          room,
          type: 'text',
        });

        io.to(message.room).emit('new-message', {
          _id: message._id,
          content: message.content,
          room: message.room,
          type: message.type,
          createdAt: message.createdAt,
          sender: {
            _id: socket.user._id,
            username: socket.user.username,
            avatarColor: socket.user.avatarColor,
          },
        });
      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const room = normalizeRoom(data?.room);
      socket.to(room).emit('user-typing', {
        username: socket.user.username,
        room,
        isTyping: Boolean(data?.isTyping),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.id);
      broadcastOnlineUsers(io);
    });
  });
};

function broadcastOnlineUsers(io) {
  const uniqueUsers = new Map();

  for (const [, userData] of onlineUsers) {
    if (!uniqueUsers.has(userData._id)) {
      uniqueUsers.set(userData._id, {
        _id: userData._id,
        username: userData.username,
        avatarColor: userData.avatarColor,
        room: userData.room,
      });
    }
  }

  io.emit('online-users', Array.from(uniqueUsers.values()));
}

module.exports = setupSocketHandlers;
