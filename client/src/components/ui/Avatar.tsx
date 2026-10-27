import React, { useState, useEffect } from 'react';
import { resolveMediaUrl, isAvatarImage } from '../../utils/media.js';

export interface AvatarProps {
  name: string;
  src?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  avatarUrl,
  size = 'md',
  isOnline,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const rawUrl = src || avatarUrl;
  const isImage = isAvatarImage(rawUrl);
  const resolvedUrl = isImage ? resolveMediaUrl(rawUrl) : '';

  useEffect(() => {
    setImageError(false);
  }, [rawUrl]);

  const sizeMap = {
    xs: { dim: 24, fontSize: '11px', dot: 6 },
    sm: { dim: 32, fontSize: '12px', dot: 8 },
    md: { dim: 40, fontSize: '14px', dot: 10 },
    lg: { dim: 52, fontSize: '18px', dot: 12 },
    xl: { dim: 80, fontSize: '28px', dot: 16 },
  };

  const { dim, fontSize, dot } = sizeMap[size];

  // Use the first letter of the display name or username.
  const cleanName = (name || '').trim();
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : '?';

  // Generate a consistent tint based on the user's name.
  const charCode = cleanName
    ? cleanName.charCodeAt(0) + (cleanName.charCodeAt(cleanName.length - 1) || 0)
    : 0;

  const tints = [
    { bg: 'var(--brand-primary)', text: 'var(--text-on-primary)' },
    { bg: 'var(--color-steel-blue)', text: '#FFFFFF' },
    { bg: 'var(--brand-secondary)', text: '#FFFFFF' },
    { bg: 'var(--color-strong-cyan)', text: '#FFFFFF' },
  ];

  const tint = tints[charCode % tints.length];
  const hasValidImage = Boolean(resolvedUrl && !imageError);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${dim}px`,
        height: `${dim}px`,
        borderRadius: 'var(--radius-full)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hasValidImage ? 'transparent' : tint.bg,
        color: tint.text,
        fontWeight: 600,
        fontSize,
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
        border: '1.5px solid var(--border-default)',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'visible',
      }}
    >
      {hasValidImage ? (
        <img
          src={resolvedUrl}
          alt={cleanName || 'User avatar'}
          crossOrigin="anonymous"
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-full)',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <span>{initial}</span>
      )}

      {typeof isOnline === 'boolean' && (
        <span
          title={isOnline ? 'Online' : 'Offline'}
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: `${dot}px`,
            height: `${dot}px`,
            borderRadius: '50%',
            backgroundColor: isOnline ? 'var(--status-online)' : 'var(--text-muted)',
            border: '2px solid var(--bg-panel)',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
};
