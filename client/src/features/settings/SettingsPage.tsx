import React, { useState, useRef } from 'react';
import { useAuth } from '../../app/AuthContext.js';
import { useTheme } from '../../app/ThemeContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { authService, userService } from '../../services/api.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { AvatarCropModal } from './AvatarCropModal.js';
import {
  ArrowLeft,
  User,
  Palette,
  Bell,
  Lock,
  MessageSquare,
  Shield,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Check,
  LogOut,
} from 'lucide-react';

interface SettingsPageProps {
  onBackToChat?: () => void;
  onBack?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBackToChat, onBack }) => {
  const handleBack = onBack || onBackToChat || (() => window.history.back());
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'privacy' | 'chat' | 'account'>('profile');

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Photo Cropping States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isUploadingCropped, setIsUploadingCropped] = useState(false);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Notification Preferences
  const [notifySounds, setNotifySounds] = useState(true);
  const [notifyDesktop, setNotifyDesktop] = useState(true);
  const [notifyBadges, setNotifyBadges] = useState(true);

  // Chat Preferences
  const [enterToSend, setEnterToSend] = useState(true);
  const [showStatusIndicator, setShowStatusIndicator] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
      toast.error('Supported formats: PNG, JPG, or WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Profile image size must be under 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseCrop = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
    setCropModalOpen(false);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingCropped(true);
    try {
      const res = await userService.uploadAvatar(croppedBlob);
      updateUser(res.data.user);
      toast.success('Profile picture saved successfully!');
      handleCloseCrop();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save cropped profile photo.');
    } finally {
      setIsUploadingCropped(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar) return;
    if (!confirm('Remove profile picture and revert to initial avatar?')) return;
    setIsSavingProfile(true);
    try {
      const res = await userService.removeAvatar();
      updateUser(res.data.user);
      toast.success('Profile picture removed. Reverted to initial.');
    } catch (err) {
      toast.error('Failed to remove profile picture.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveProfileDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
      });
      updateUser(res.data.user);
      toast.success('Profile changes saved successfully.');
    } catch (err) {
      toast.error('Failed to save profile details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both current and new passwords.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setIsChangingPass(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const navItems = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'chat', label: 'Chat Preferences', icon: MessageSquare },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Settings Navigation Sidebar */}
      <aside
        style={{
          width: '280px',
          height: '100%',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Back to Chats Action Header */}
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-default)' }}>
          <button
            onClick={handleBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              color: 'var(--brand-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Chats</span>
          </button>
          <h1
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: 'var(--space-4)',
            }}
          >
            Settings
          </h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage preferences & identity
          </p>
        </div>

        {/* Category List */}
        <div style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
                  color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                  border: 'none',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <Icon size={18} color={isSelected ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer User Info */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <Avatar name={user?.displayName || 'User'} avatarUrl={user?.avatar} size="md" isOnline={true} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.displayName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{user?.username}</div>
          </div>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          padding: 'var(--space-8) var(--space-12)',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Public Profile
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Manage your display avatar, public name, and presence status across Chatterly.
                </p>
              </div>

              {/* Profile Picture Card */}
              <div
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-6)',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar
                    name={user?.displayName || 'User'}
                    src={user?.avatar}
                    size="xl"
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Profile Photo
                  </h3>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    Select an image to zoom, reposition, and crop before saving. Supported formats: PNG, JPG, WebP (up to 10MB).
                  </p>

                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSavingProfile || isUploadingCropped}
                    >
                      <Upload size={14} />
                      <span>{user?.avatar ? 'Change & Crop Photo' : 'Upload & Crop Photo'}</span>
                    </Button>

                    {user?.avatar ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isSavingProfile || isUploadingCropped}
                        style={{ color: 'var(--status-error)' }}
                      >
                        <Trash2 size={14} />
                        <span>Remove Photo</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Form Details */}
              <form
                onSubmit={handleSaveProfileDetails}
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  required
                />

                <Input
                  label="Username"
                  value={`@${user?.username || ''}`}
                  disabled
                  helperText="Your unique handle is reserved on Chatterly."
                />

                <Input
                  label="Status Message"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="e.g. Focus time · Reviewing pull requests"
                  maxLength={120}
                />

                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Button type="submit" variant="primary" size="md" isLoading={isSavingProfile}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Theme & Visual Identity
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Chatterly uses the cohesive Slate & Arctic Cyan design system with coordinated dark and light modes.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 'var(--space-4)',
                }}
              >
                {[
                  { id: 'light', label: 'Light Theme', icon: Sun, desc: 'Cloud White & Deep Slate' },
                  { id: 'dark', label: 'Dark Theme', icon: Moon, desc: 'Deep Slate & Arctic Cyan' },
                  { id: 'system', label: 'System Default', icon: Monitor, desc: 'Syncs with device OS' },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as any)}
                      style={{
                        padding: 'var(--space-5)',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--bg-panel)',
                        border: `2px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Icon size={22} color={isSelected ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                        {isSelected ? <Check size={16} color="var(--brand-primary)" /> : null}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {t.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Palette Preview Card */}
              <div
                style={{
                  padding: 'var(--space-5)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  Core Palette Tokens
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Deep Slate', hex: '#242B35' },
                    { name: 'Steel Blue', hex: '#364353' },
                    { name: 'Muted Slate', hex: '#627487' },
                    { name: 'Arctic Cyan', hex: '#55A9C7' },
                    { name: 'Strong Cyan', hex: '#287F9F' },
                    { name: 'Cloud White', hex: '#F7F9FB' },
                  ].map((color) => (
                    <div key={color.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: color.hex,
                          border: '1px solid var(--border-default)',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{color.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notification Settings
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Choose how and when Chatterly alerts you about incoming direct messages and mentions.
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                {[
                  {
                    title: 'In-App Sound Alerts',
                    desc: 'Play a subtle sound when a new direct message arrives.',
                    state: notifySounds,
                    setter: setNotifySounds,
                  },
                  {
                    title: 'Desktop Push Notifications',
                    desc: 'Display OS notifications when Chatterly is running in the background.',
                    state: notifyDesktop,
                    setter: setNotifyDesktop,
                  },
                  {
                    title: 'Unread Badges',
                    desc: 'Show unread message count badges in channels and direct messages.',
                    state: notifyBadges,
                    setter: setNotifyBadges,
                  },
                ].map((n, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: 'var(--space-3)',
                      borderBottom: i < 2 ? '1px solid var(--border-default)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {n.desc}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        n.setter(!n.state);
                        toast.success(`${n.title} preference updated.`);
                      }}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: n.state ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                        position: 'relative',
                        transition: 'background-color var(--transition-fast)',
                        border: '1px solid var(--border-default)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: n.state ? '22px' : '3px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          transition: 'left var(--transition-fast)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRIVACY & SECURITY TAB */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Privacy & Security
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Manage your account credentials, presence privacy, and security settings.
                </p>
              </div>

              {/* Password update form */}
              <form
                onSubmit={handleChangePassword}
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Change Password
                </h3>

                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Button type="submit" variant="primary" size="md" isLoading={isChangingPass}>
                    Update Password
                  </Button>
                </div>
              </form>

              {/* Presence Privacy Toggle */}
              <div
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    Share Online Presence
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    Display the green dot next to your avatar when you are active on Chatterly.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusIndicator(!showStatusIndicator);
                    toast.success('Presence visibility preference updated.');
                  }}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: showStatusIndicator ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                    position: 'relative',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: showStatusIndicator ? '22px' : '3px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transition: 'left var(--transition-fast)',
                    }}
                  />
                </button>
              </div>
            </div>
          )}

          {/* CHAT PREFERENCES TAB */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Chat Preferences
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Configure message composition, keyboard shortcuts, and media display options.
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                      Enter to Send Message
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      When enabled, press Enter to send and Shift + Enter for a new line.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnterToSend(!enterToSend);
                      toast.success('Keyboard shortcut preference saved.');
                    }}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: enterToSend ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                      position: 'relative',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: enterToSend ? '22px' : '3px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transition: 'left var(--transition-fast)',
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Account Management
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Review active session details and sign out of your device.
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--space-6)',
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Email Address
                  </span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email || 'N/A'}</div>
                </div>

                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Account Role
                  </span>
                  <div style={{ fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'capitalize' }}>
                    {user?.role || 'Member'}
                  </div>
                </div>

                <div style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
                  <Button variant="danger" size="md" onClick={logout}>
                    <LogOut size={16} />
                    <span>Sign Out of Chatterly</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Avatar Crop & Preview Modal */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={handleCloseCrop}
        onCropComplete={handleCropComplete}
        isLoading={isUploadingCropped}
      />
    </div>
  );
};
