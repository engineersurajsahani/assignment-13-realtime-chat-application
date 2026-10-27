import React from 'react';

interface BrandedLoadingProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const BrandedLoading: React.FC<BrandedLoadingProps> = ({
  message = 'Connecting to Chatterly...',
  subMessage = 'Hydrating real-time messaging workspace',
  fullScreen = true,
}) => {
  return (
    <div
      style={{
        height: fullScreen ? '100vh' : '100%',
        width: fullScreen ? '100vw' : '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        gap: 'var(--space-4)',
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Glowing pulse ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: 'var(--radius-xl)',
            background: 'radial-gradient(circle, rgba(85, 169, 199, 0.4) 0%, transparent 70%)',
            animation: 'pulse 2s infinite ease-in-out',
          }}
        />
        <img
          src="/chatterly-logo.jpg"
          alt="Chatterly"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-xl)',
            objectFit: 'cover',
            boxShadow: '0 8px 24px rgba(40, 127, 159, 0.35)',
            border: '2px solid var(--brand-primary)',
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
          {message}
        </div>
        {subMessage && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
            {subMessage}
          </div>
        )}
      </div>
    </div>
  );
};
