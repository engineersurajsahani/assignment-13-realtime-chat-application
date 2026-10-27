import React, { useState } from 'react';
import { useAuth } from '../../app/AuthContext.js';
import { useTheme } from '../../app/ThemeContext.js';
import { useSocket } from '../../app/SocketContext.js';
import { Conversation } from '../../types/index.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatChannelName } from '../../utils/format.js';
import {
  Hash,
  Users,
  Plus,
  Compass,
  Settings,
  LogOut,
  Sun,
  Moon,
  Search,
  KeyRound,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface NavigationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conv: Conversation) => void;
  onSelectAI: () => void;
  isAIActive: boolean;
  onOpenCreateGroup: () => void;
  onOpenJoinGroup: () => void;
  onOpenDirectMessage: () => void;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onSelectAI,
  isAIActive,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenDirectMessage,
  onOpenSettings,
  isOpenMobile,
}) => {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isConnected, onlineUsers } = useSocket();
  const [filterText, setFilterText] = useState('');

  // Group conversations by category
  const publicChannels = conversations.filter((c) => c.isPublicChannel);
  const directMessages = conversations.filter((c) => c.type === 'direct');
  const privateGroups = conversations.filter((c) => c.type === 'group');

  const filteredChannels = publicChannels.filter((c) =>
    (c.name || '').toLowerCase().includes(filterText.toLowerCase())
  );
  const filteredDMs = directMessages.filter((c) => {
    const name = c.otherParticipant?.displayName || c.name || '';
    return name.toLowerCase().includes(filterText.toLowerCase());
  });
  const filteredGroups = privateGroups.filter((c) =>
    (c.name || '').toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <aside
      style={{
        display: 'flex',
        height: '100%',
        zIndex: 50,
        flexShrink: 0,
      }}
      className={isOpenMobile ? 'sidebar-mobile-open' : ''}
    >
      {/* 1. LEFT-MOST ICON RAIL (Inspired by UI Reference) */}
      <div
        style={{
          width: '64px',
          height: '100%',
          backgroundColor: 'var(--bg-app)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          flexShrink: 0,
        }}
      >
        {/* Top: Logo & Main Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Brand Mark */}
          <div
            title="Chatterly"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 6px 20px rgba(85, 169, 199, 0.45)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1E2530',
              border: '2px solid rgba(85, 169, 199, 0.65)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <img
              src="/chatterly-logo.jpg"
              alt="Chatterly"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Rail Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            {/* Chats Icon */}
            <button
              onClick={() => {
                if (isAIActive && conversations.length > 0) {
                  onSelectConversation(conversations[0]);
                }
              }}
              title="All Chats"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: !isAIActive ? 'var(--bg-selected)' : 'transparent',
                color: !isAIActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                border: !isAIActive ? '1px solid var(--border-accent)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <MessageSquare size={20} />
            </button>

            {/* Chatterly AI Icon */}
            <button
              onClick={onSelectAI}
              title="Chatterly AI Assistant"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isAIActive ? 'var(--bg-selected)' : 'transparent',
                color: isAIActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                border: isAIActive ? '1px solid var(--border-accent)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Sparkles size={20} />
            </button>

            {/* Settings Full Page Icon */}
            <button
              onClick={onOpenSettings}
              title="Settings (Full Page)"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Rail: Theme, Logout & User Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              display: 'flex',
            }}
          >
            {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--status-error)',
              border: '1px solid var(--border-default)',
              display: 'flex',
            }}
          >
            <LogOut size={17} />
          </button>

          {/* User Profile Avatar with Online Indicator */}
          <button
            onClick={onOpenSettings}
            title={`Signed in as ${user?.displayName || 'User'} (Click to view Profile & Settings)`}
            style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <Avatar
              src={user?.avatar}
              name={user?.displayName || user?.username || 'User'}
              size="md"
              isOnline={true}
            />
          </button>
        </div>
      </div>

      {/* 2. SECONDARY CONVERSATION & CHANNEL LIST PANEL (Width: ~280px) */}
      <div
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
        {/* Top Header: Brand Title & Connection Status */}
        <div
          style={{
            padding: '16px 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Chatterly
            </h2>
          </div>

          <div
            title={isConnected ? 'Connected' : 'Reconnecting...'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: isConnected ? 'var(--status-online)' : 'var(--status-warning)',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--status-online)' : 'var(--status-warning)',
              }}
            />
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ padding: '0 14px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder="Search or start new chat..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: 'var(--text-primary)',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* "ONLINE NOW" Horizontal Roster (Inspired by UI Reference) */}
        {onlineUsers && onlineUsers.length > 0 && (
          <div style={{ padding: '0 14px 14px', borderBottom: '1px solid var(--border-default)' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Online Now</span>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{onlineUsers.length}</span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '4px',
              }}
            >
              {onlineUsers.slice(0, 8).map((ou) => (
                <div
                  key={ou.id}
                  title={`${ou.displayName} (@${ou.username})`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '44px',
                    cursor: 'pointer',
                  }}
                  onClick={onOpenDirectMessage}
                >
                  <Avatar
                    src={ou.avatar}
                    name={ou.displayName || ou.username}
                    size="md"
                    isOnline={true}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      maxWidth: '48px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    {ou.displayName?.split(' ')[0] || ou.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Conversation Categories */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {/* CHATTERLY AI (First-class conversation item) */}
          <div style={{ marginBottom: '14px' }}>
            <button
              type="button"
              onClick={onSelectAI}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isAIActive ? 'var(--bg-selected)' : 'var(--bg-elevated)',
                border: `1px solid ${isAIActive ? 'var(--border-accent)' : 'var(--border-default)'}`,
                color: isAIActive ? 'var(--brand-primary)' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all var(--transition-fast)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1.5px solid rgba(85, 169, 199, 0.4)',
                    boxShadow: '0 2px 6px rgba(85, 169, 199, 0.25)',
                  }}
                >
                  <img
                    src="/chatterly-logo.jpg"
                    alt="Chatterly AI"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '14px', lineHeight: 1.2 }}>Chatterly AI</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    Engineering & Chat Assistant
                  </div>
                </div>
              </div>
              <Badge variant="brand" size="sm">AI</Badge>
            </button>
          </div>

          {/* PUBLIC CHANNELS */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span>Public Channels</span>
              <Compass size={14} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {filteredChannels.map((channel) => {
                const isSelected = !isAIActive && activeConversationId === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectConversation(channel)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '14px',
                      transition: 'background-color var(--transition-fast)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Hash size={18} color="var(--brand-primary)" />
                      <span style={{ fontSize: '14px' }}>{formatChannelName(channel.name || '')}</span>
                    </div>
                    {channel.unreadCount > 0 ? (
                      <Badge variant="brand">{channel.unreadCount}</Badge>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIRECT MESSAGES */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span>Direct Messages</span>
              <button
                onClick={onOpenDirectMessage}
                title="Start Direct Message"
                style={{
                  color: 'var(--brand-primary)',
                  padding: '2px',
                  display: 'flex',
                  backgroundColor: 'transparent',
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {filteredDMs.length === 0 ? (
                <div style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No active direct messages
                </div>
              ) : (
                filteredDMs.map((dm) => {
                  const isSelected = !isAIActive && activeConversationId === dm.id;
                  const other = dm.otherParticipant;
                  const isOnline = other ? onlineUsers.some((u) => u.id === other.id) : false;

                  return (
                    <button
                      key={dm.id}
                      onClick={() => onSelectConversation(dm)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: '14px',
                        transition: 'background-color var(--transition-fast)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <Avatar
                          src={other?.avatar}
                          name={other?.displayName || dm.name || 'User'}
                          size="sm"
                          isOnline={isOnline}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {other?.displayName || dm.name}
                        </span>
                      </div>
                      {dm.unreadCount > 0 ? (
                        <Badge variant="brand">{dm.unreadCount}</Badge>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PRIVATE GROUPS */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span>Private Groups</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={onOpenJoinGroup}
                  title="Join with Code"
                  style={{
                    color: 'var(--brand-primary)',
                    padding: '2px',
                    display: 'flex',
                    backgroundColor: 'transparent',
                  }}
                >
                  <KeyRound size={15} />
                </button>
                <button
                  onClick={onOpenCreateGroup}
                  title="Create Private Group"
                  style={{
                    color: 'var(--brand-primary)',
                    padding: '2px',
                    display: 'flex',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {filteredGroups.length === 0 ? (
                <div style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No private groups yet
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isSelected = !isAIActive && activeConversationId === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => onSelectConversation(group)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: '14px',
                        transition: 'background-color var(--transition-fast)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <Users size={18} color="var(--brand-secondary)" />
                        <span
                          style={{
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {group.name}
                        </span>
                      </div>
                      {group.unreadCount > 0 ? (
                        <Badge variant="brand">{group.unreadCount}</Badge>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
