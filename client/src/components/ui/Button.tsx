import React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    transition: 'background-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast)',
    gap: 'var(--space-2)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: 'var(--font-size-xs)' },
    md: { padding: '8px 16px', fontSize: 'var(--font-size-sm)' },
    lg: { padding: '12px 24px', fontSize: 'var(--font-size-base)' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--brand-primary)',
      color: 'var(--text-on-primary)',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--brand-primary)',
      border: '1px solid var(--brand-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      border: 'none',
    },
    danger: {
      backgroundColor: 'var(--status-error)',
      color: '#FFFFFF',
      border: 'none',
    },
  };

  return (
    <button
      {...props}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...props.style,
      }}
      className={clsx('pulse-btn', `pulse-btn-${variant}`, className)}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : null}
      {children}
    </button>
  );
};
