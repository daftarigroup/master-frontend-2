import React from 'react';

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '',
  avatarUrl,
  size = 32,
  className = '',
}) => {
  const [imgError, setImgError] = React.useState(false);

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const getBgColor = (n: string) => {
    const colors = [
      'bg-indigo-500',
      'bg-blue-500',
      'bg-emerald-500',
      'bg-violet-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-sky-500',
      'bg-teal-500',
    ];
    let hash = 0;
    for (let i = 0; i < (n || '').length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium text-white shrink-0 shadow-sm ${getBgColor(
        name || ''
      )} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.38)),
      }}
      title={name || undefined}
    >
      {getInitials(name || '')}
    </div>
  );
};

export default UserAvatar;
