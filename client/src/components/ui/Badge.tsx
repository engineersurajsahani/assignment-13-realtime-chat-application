import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'secondary' | 'success' | 'error' | 'muted';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'brand', size = 'sm' }) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    brand: {
      backgroundColor: 'var(--brand-primary)',
      color: 'var(--text-on-primary)',
    },
    secondary: {
      backgroundColor: 'var(--brand-soft)',
      color: 'var(--text-primary)',
    },
    success: {
      backgroundColor: 'var(--status-online)',
      color: '#FFFFFF',
    },
    error: {
      backgroundColor: 'var(--status-error)',
      color: '#FFFFFF',
    },
    muted: {
      backgroundColor: 'var(--bg-elevated)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-default)',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '2px 7px', fontSize: '11px', borderRadius: 'var(--radius-full)' },
    md: { padding: '4px 10px', fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-full)' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        lineHeight: 1,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  );
};
