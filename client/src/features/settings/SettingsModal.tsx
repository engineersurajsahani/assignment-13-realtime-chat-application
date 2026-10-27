import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { useAuth } from '../../app/AuthContext.js';
import { useTheme } from '../../app/ThemeContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { authService } from '../../services/api.js';
import { Sun, Moon, Monitor } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'A');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const avatarChoices = ['A', 'M', 'S', 'R', 'J', 'P'];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await authService.updateProfile({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        avatar,
        theme,
      });
      updateUser(res.data.user);
      toast.success('Profile preferences updated.');
      onClose();
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter both passwords.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    setIsChangingPass(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings & Preferences"
      description="Customize your profile, appearance, and security credentials."
      maxWidth="500px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Theme Preference */}
        <div>
          <label
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'block',
              marginBottom: 'var(--space-2)',
            }}
          >
            Interface Theme
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                    backgroundColor: isSelected ? 'var(--bg-selected)' : 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <Icon size={14} color={isSelected ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Profile Details
          </h3>

          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <Input
            label="Status Message"
            placeholder="e.g. In a meeting / Deep work"
            value={statusMessage}
            onChange={(e) => setStatusMessage(e.target.value)}
          />

          <div>
            <label
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 'var(--space-1)',
              }}
            >
              Avatar Character
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {avatarChoices.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: avatar === av ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                    color: avatar === av ? 'var(--text-on-primary)' : 'var(--text-primary)',
                    border: `2px solid ${avatar === av ? 'var(--brand-secondary)' : 'var(--border-default)'}`,
                    fontWeight: 600,
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" variant="primary" size="md" isLoading={isSaving} style={{ marginTop: 'var(--space-2)' }}>
            Save Profile
          </Button>
        </form>

        {/* Security / Password section */}
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Change Password
          </h3>

          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <Input
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Button type="submit" variant="secondary" size="md" isLoading={isChangingPass}>
            Update Password
          </Button>
        </form>
      </div>
    </Modal>
  );
};
