export default function UserAvatar({ username, color, size = 'medium', showStatus = false }) {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '??';

  const sizeClass = size === 'small' ? 'small' : size === 'large' ? 'large' : '';

  return (
    <div
      className={`user-avatar ${sizeClass}`}
      style={{ backgroundColor: color || '#6C5CE7' }}
      title={username}
    >
      {initials}
      {showStatus && <span className="avatar-status" />}
    </div>
  );
}
