import React, { useState } from 'react';
import { useAuth } from '../../app/AuthContext.js';
import { useTheme } from '../../app/ThemeContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (mode === 'login') {
      if (!identifier.trim()) errors.identifier = 'Please enter your username or email.';
      if (!password) errors.password = 'Please enter your password.';
    } else {
      if (!regDisplayName.trim()) errors.regDisplayName = 'Display name is required.';
      if (!regUsername.trim()) errors.regUsername = 'Username is required.';
      else if (!/^[a-zA-Z0-9_]{3,20}$/.test(regUsername.trim())) {
        errors.regUsername = 'Username must be 3-20 characters (letters, numbers, underscores).';
      }
      if (!regEmail.trim()) errors.regEmail = 'Email address is required.';
      else if (!/\S+@\S+\.\S+/.test(regEmail.trim())) {
        errors.regEmail = 'Please provide a valid email address.';
      }
      if (!regPassword) errors.regPassword = 'Password is required.';
      else if (regPassword.length < 6) {
        errors.regPassword = 'Password must be at least 6 characters.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({ identifier: identifier.trim(), password });
        toast.success('Welcome back to Chatterly!');
      } else {
        await register({
          username: regUsername.trim(),
          displayName: regDisplayName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        });
        toast.success('Account created successfully! Welcome to Chatterly.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Authentication failed. Please verify your credentials.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* WHOLE LEFT SIDEBAR OCCUPIED WITH USER SUPPLIED POSTER IMAGE */}
      <div className="auth-left-sidebar">
        <img
          src="/Chatterly.png"
          alt="Chatterly Platform"
        />
      </div>

      {/* RIGHT SIDEBAR WITH AUTHENTICATION CARD */}
      <div className="auth-right-content">
        {/* Theme Switcher in Top Right */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* AUTHENTICATION CARD */}
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '20px',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
            padding: '28px 28px',
            boxSizing: 'border-box',
          }}
        >
          {/* Prominent Cropped Chatterly Logo (Icon Only, No Text) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(85, 169, 199, 0.45)',
                border: '2px solid rgba(85, 169, 199, 0.75)',
                backgroundColor: '#1E2530',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
              }}
            >
              <img
                src="/chatterly-logo.jpg"
                alt="Chatterly"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 4px',
              }}
            >
              Chatterly
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
              {mode === 'login'
                ? 'Welcome back! Sign in to continue your conversations.'
                : 'Create your account to start real-time messaging.'}
            </p>
          </div>

          {/* Segmented Button Control: Sign In / Create Account */}
          <div
            style={{
              display: 'flex',
              padding: '4px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              marginBottom: '18px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFieldErrors({});
              }}
              className="auth-tab-btn"
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: '13.5px',
                fontWeight: mode === 'login' ? 700 : 500,
                color: mode === 'login' ? 'var(--brand-primary)' : 'var(--text-muted)',
                backgroundColor: mode === 'login' ? 'var(--bg-panel)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setFieldErrors({});
              }}
              className="auth-tab-btn"
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: '13.5px',
                fontWeight: mode === 'register' ? 700 : 500,
                color: mode === 'register' ? 'var(--brand-primary)' : 'var(--text-muted)',
                backgroundColor: mode === 'register' ? 'var(--bg-panel)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {mode === 'login' ? (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Username or Email
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your username or email"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: '' });
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${fieldErrors.identifier ? 'var(--status-error)' : 'var(--border-default)'}`,
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {fieldErrors.identifier && (
                    <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                      {fieldErrors.identifier}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${fieldErrors.password ? 'var(--status-error)' : 'var(--border-default)'}`,
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                      {fieldErrors.password}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Full Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jui Tawde"
                    value={regDisplayName}
                    onChange={(e) => {
                      setRegDisplayName(e.target.value);
                      if (fieldErrors.regDisplayName) setFieldErrors({ ...fieldErrors, regDisplayName: '' });
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${fieldErrors.regDisplayName ? 'var(--status-error)' : 'var(--border-default)'}`,
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {fieldErrors.regDisplayName && (
                    <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                      {fieldErrors.regDisplayName}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="unique_username"
                    value={regUsername}
                    onChange={(e) => {
                      setRegUsername(e.target.value);
                      if (fieldErrors.regUsername) setFieldErrors({ ...fieldErrors, regUsername: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${fieldErrors.regUsername ? 'var(--status-error)' : 'var(--border-default)'}`,
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {fieldErrors.regUsername && (
                    <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                      {fieldErrors.regUsername}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (fieldErrors.regEmail) setFieldErrors({ ...fieldErrors, regEmail: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${fieldErrors.regEmail ? 'var(--status-error)' : 'var(--border-default)'}`,
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {fieldErrors.regEmail && (
                    <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                      {fieldErrors.regEmail}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (fieldErrors.regPassword) setFieldErrors({ ...fieldErrors, regPassword: '' });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${fieldErrors.regPassword ? 'var(--status-error)' : 'var(--border-default)'}`,
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.regPassword && (
                    <div style={{ fontSize: '11px', color: 'var(--status-error)', marginTop: '4px' }}>
                      {fieldErrors.regPassword}
                    </div>
                  )}
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: '12px',
                marginTop: '6px',
                letterSpacing: '-0.01em',
              }}
            >
              {mode === 'login' ? 'Sign In to Chatterly' : 'Create Your Account'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {mode === 'login' ? (
                  <>
                    New to Chatterly?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setFieldErrors({});
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setFieldErrors({});
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Sign in here
                    </button>
                  </>
                )}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
