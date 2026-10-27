import React, { useEffect, useState } from 'react';
import { Conversation, Message } from '../../types/index.js';
import { conversationService } from '../../services/api.js';
import { useSocket } from '../../app/SocketContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatChannelName } from '../../utils/format.js';
import { resolveMediaUrl } from '../../utils/media.js';
import {
  X,
  Copy,
  Users,
  Pin,
  BellOff,
  Bell,
  Archive,
  LogOut,
  Info,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Download,
  Calendar,
} from 'lucide-react';

interface ContextPanelProps {
  conversation: Conversation;
  onClose: () => void;
  onConversationUpdated: () => void;
  pinnedMessages: Message[];
}

type TabKey = 'overview' | 'media' | 'links' | 'docs';

export const ContextPanel: React.FC<ContextPanelProps> = ({
  conversation,
  onClose,
  onConversationUpdated,
  pinnedMessages,
}) => {
  const { onlineUsers } = useSocket();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [members, setMembers] = useState<any[]>([]);

  // Real data state
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [linkItems, setLinkItems] = useState<any[]>([]);
  const [docItems, setDocItems] = useState<any[]>([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  // Preview modal for images
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Load conversation details
  useEffect(() => {
    async function loadDetails() {
      try {
        if (!conversation?.id) return;
        const res = await conversationService.getConversation(conversation.id);
        const validMembers = (res.data?.members || []).filter((m: any) => m && m.user);
        setMembers(validMembers);
      } catch {
        // public channels might not have explicit memberships
      }
    }
    loadDetails();
  }, [conversation?.id]);

  // Load tab-specific content when tab changes
  useEffect(() => {
    async function loadTabData() {
      setIsLoadingTab(true);
      try {
        if (activeTab === 'media') {
          const res = await conversationService.getConversationMedia(conversation.id);
          setMediaItems(res.data.media || []);
        } else if (activeTab === 'links') {
          const res = await conversationService.getConversationLinks(conversation.id);
          setLinkItems(res.data.links || []);
        } else if (activeTab === 'docs') {
          const res = await conversationService.getConversationDocs(conversation.id);
          setDocItems(res.data.docs || []);
        }
      } catch {
        // fail gracefully
      } finally {
        setIsLoadingTab(false);
      }
    }

    if (activeTab !== 'overview') {
      loadTabData();
    }
  }, [activeTab, conversation.id]);

  const handleCopyCode = () => {
    if (conversation.code) {
      navigator.clipboard.writeText(conversation.code);
      toast.success('Group invitation code copied to clipboard!');
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleToggleMute = async () => {
    try {
      const res = await conversationService.toggleMute(conversation.id);
      toast.success(res.data.isMuted ? 'Conversation muted.' : 'Notifications unmuted.');
      onConversationUpdated();
    } catch {
      toast.error('Failed to update mute settings.');
    }
  };

  const handleToggleArchive = async () => {
    try {
      const res = await conversationService.toggleArchive(conversation.id);
      toast.success(res.data.isArchived ? 'Conversation archived.' : 'Conversation unarchived.');
      onConversationUpdated();
    } catch {
      toast.error('Failed to update archive state.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm(`Are you sure you want to leave ${conversation.name}?`)) return;
    try {
      await conversationService.leaveGroup(conversation.id);
      toast.success('Left group successfully.');
      onConversationUpdated();
      onClose();
    } catch {
      toast.error('Failed to leave group.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <aside
      style={{
        width: '340px',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Info size={16} color="var(--brand-primary)" />
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Conversation Info
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          style={{
            color: 'var(--text-muted)',
            display: 'flex',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'transparent',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Profile / Channel Overview Banner */}
      <div
        style={{
          padding: 'var(--space-4)',
          textAlign: 'center',
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'inline-block', marginBottom: '8px' }}>
          <Avatar
            src={conversation.otherParticipant?.avatar}
            name={conversation.otherParticipant?.displayName || conversation.name || 'Conversation'}
            size="xl"
          />
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {conversation.type === 'direct'
            ? conversation.otherParticipant?.displayName || conversation.name
            : formatChannelName(conversation.name || '')}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          {conversation.type === 'direct'
            ? `@${conversation.otherParticipant?.username || 'user'}`
            : conversation.description || 'Public channel for team communication.'}
        </p>

        {conversation.type === 'group' && conversation.code ? (
          <div
            style={{
              marginTop: '10px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--brand-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Invite Code
              </span>
              <div style={{ fontWeight: 700, letterSpacing: '0.08em', color: 'var(--brand-primary)', fontSize: '13px' }}>
                {conversation.code}
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--brand-primary)',
                fontWeight: 600,
                backgroundColor: 'var(--bg-elevated)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <Copy size={12} />
              <span>Copy</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Tabs Navigation: Overview, Media, Links, Docs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '12px',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            color: activeTab === 'overview' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'overview' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '12px',
            fontWeight: activeTab === 'media' ? 700 : 500,
            color: activeTab === 'media' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'media' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <ImageIcon size={13} />
          <span>Media</span>
        </button>

        <button
          onClick={() => setActiveTab('links')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '12px',
            fontWeight: activeTab === 'links' ? 700 : 500,
            color: activeTab === 'links' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'links' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <LinkIcon size={13} />
          <span>Links</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '12px',
            fontWeight: activeTab === 'docs' ? 700 : 500,
            color: activeTab === 'docs' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'docs' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <FileText size={13} />
          <span>Docs</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={handleToggleMute}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  textAlign: 'left',
                }}
              >
                {conversation.membership?.isMuted ? (
                  <>
                    <Bell size={16} color="var(--brand-primary)" />
                    <span>Unmute Notifications</span>
                  </>
                ) : (
                  <>
                    <BellOff size={16} color="var(--text-muted)" />
                    <span>Mute Notifications</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleArchive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  textAlign: 'left',
                }}
              >
                <Archive size={16} color="var(--text-muted)" />
                <span>{conversation.membership?.isArchived ? 'Unarchive Channel' : 'Archive Channel'}</span>
              </button>

              {conversation.type === 'group' ? (
                <button
                  onClick={handleLeaveGroup}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--status-error)',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={16} />
                  <span>Leave Group</span>
                </button>
              ) : null}
            </div>

            {/* Pinned Messages */}
            {pinnedMessages && pinnedMessages.length > 0 ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  <Pin size={13} color="var(--brand-primary)" />
                  <span>Pinned Messages ({pinnedMessages.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pinnedMessages.map((pin) => (
                    <div
                      key={pin.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        borderLeft: '3px solid var(--brand-primary)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {pin.sender?.displayName || pin.sender?.username}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>{pin.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Members List with Uploaded Avatars */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} />
                  <span>Members ({members.length || onlineUsers.length})</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {members.length > 0
                  ? members.map((m) => {
                      const u = m?.user || {};
                      const userId = String(u._id || u.id || '');
                      const isOnline = onlineUsers.some((ou) => String(ou.id) === userId);
                      const displayName = u.displayName || u.username || 'Member';
                      return (
                        <div
                          key={m._id || m.id || userId || Math.random()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-elevated)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Avatar
                              src={u.avatar}
                              name={displayName}
                              size="sm"
                              isOnline={isOnline}
                            />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {displayName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {u.username ? `@${u.username}` : ''}
                              </div>
                            </div>
                          </div>
                          <Badge variant={m.role === 'owner' ? 'brand' : 'muted'} size="sm">
                            {m.role || 'member'}
                          </Badge>
                        </div>
                      );
                    })
                  : onlineUsers.map((ou) => (
                      <div
                        key={ou.id || Math.random()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        <Avatar
                          src={ou.avatar}
                          name={ou.displayName || ou.username || 'User'}
                          size="sm"
                          isOnline={true}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {ou.displayName || ou.username || 'User'}
                        </span>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}

        {/* MEDIA TAB (Grid of real images) */}
        {activeTab === 'media' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {mediaItems.length} {mediaItems.length === 1 ? 'image' : 'images'} shared
              </span>
            </div>

            {isLoadingTab ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading conversation media...
              </div>
            ) : mediaItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-default)',
                }}
              >
                <ImageIcon size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No media shared yet
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Photos and images posted in this chat will appear here.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}
              >
                {mediaItems.map((item) => (
                  <button
                    key={item.id || item._id || item.url || Math.random()}
                    type="button"
                    onClick={() => setPreviewMediaUrl(item.url)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={resolveMediaUrl(item.url)}
                      alt={item.name}
                      loading="lazy"
                      crossOrigin="anonymous"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LINKS TAB */}
        {activeTab === 'links' && (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {linkItems.length} {linkItems.length === 1 ? 'link' : 'links'} shared
              </span>
            </div>

            {isLoadingTab ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading links...
              </div>
            ) : linkItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-default)',
                }}
              >
                <LinkIcon size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No links found
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Web URLs posted in this conversation will be cataloged here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkItems.map((link) => (
                  <div
                    key={link.id || link._id || link.url || Math.random()}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--brand-primary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {link.domain || 'link'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        wordBreak: 'break-all',
                        fontWeight: 500,
                      }}
                    >
                      {link.url}
                    </a>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>Shared by {link.sender?.displayName || 'User'}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleCopyLink(link.url)}
                          title="Copy link"
                          style={{
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-panel)',
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Copy size={11} />
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open link"
                          style={{
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-panel)',
                            fontSize: '11px',
                            color: 'var(--brand-primary)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {docItems.length} {docItems.length === 1 ? 'file' : 'files'} shared
              </span>
            </div>

            {isLoadingTab ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading documents...
              </div>
            ) : docItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-default)',
                }}
              >
                <FileText size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  No files shared
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Documents, PDFs, and archives uploaded in this chat will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docItems.map((doc) => (
                  <div
                    key={doc.id || doc._id || doc.url || Math.random()}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-panel)',
                          border: '1px solid var(--border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--brand-primary)',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.name || 'document'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                          <span>{formatFileSize(doc.size || 0)}</span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Calendar size={10} />
                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={resolveMediaUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                      title="Download file"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-panel)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Download size={15} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Resolution Media Preview Modal */}
      {previewMediaUrl && (
        <div
          onClick={() => setPreviewMediaUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button
              onClick={() => setPreviewMediaUrl(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <X size={18} />
            </button>
            <img
              src={resolveMediaUrl(previewMediaUrl)}
              alt="Media Preview"
              crossOrigin="anonymous"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </aside>
  );
};
