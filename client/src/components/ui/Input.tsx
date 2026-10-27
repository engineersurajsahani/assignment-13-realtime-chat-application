import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%' }}>
        {label ? (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </label>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            backgroundColor: 'var(--bg-input)',
            border: `1px solid ${error ? 'var(--status-error)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          {leftIcon ? (
            <span style={{ paddingLeft: 'var(--space-3)', color: 'var(--text-muted)', display: 'flex' }}>
              {leftIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 'var(--font-size-sm)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
            }}
            className={clsx('pulse-input', className)}
            {...props}
          />

          {rightIcon ? (
            <span style={{ paddingRight: 'var(--space-3)', color: 'var(--text-muted)', display: 'flex' }}>
              {rightIcon}
            </span>
          ) : null}
        </div>

        {error ? (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--status-error)' }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
