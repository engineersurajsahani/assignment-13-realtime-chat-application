import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message } from '../../types/index.js';
import { useAuth } from '../../app/AuthContext.js';
import { useSocket } from '../../app/SocketContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { messageService, userService } from '../../services/api.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { formatChannelName } from '../../utils/format.js';
import { resolveMediaUrl } from '../../utils/media.js';
import {
  Hash,
  Users,
  Search,
  Sidebar as SidebarIcon,
  Send,
  Paperclip,
  Smile,
  X,
  Reply,
  Pin,
  Trash2,
  Edit2,
  Flag,
  FileText,
  Menu,
  ChevronUp,
} from 'lucide-react';

interface ConversationAreaProps {
  conversation: Conversation;
  messages: Message[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  onOpenContextPanel: () => void;
  onOpenAISummary: () => void;
  onOpenSearch?: () => void;
  onOpenReport: (messageId: string) => void;
  onToggleMobileSidebar: () => void;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  conversation,
  messages,
  hasMore,
  onLoadMore,
  isLoadingMore,
  onOpenContextPanel,
  onOpenAISummary,
  onOpenSearch,
  onOpenReport,
  onToggleMobileSidebar,
}) => {
  const { user } = useAuth();
  const { sendChatMessage, startTyping, stopTyping, toggleReaction, isConnected } = useSocket();
  const toast = useToast();

  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; url: string; size: number; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // In-conversation search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Emoji picker quick popover
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const quickEmojis = ['👍', '❤️', '😂', '🎉', '🚀', '🔥', '👀', '🙌'];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message unless scrolled up
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const targetRoom = conversation.name || conversation.id;
    if (e.target.value.trim().length > 0) {
      startTyping(targetRoom);
    } else {
      stopTyping(targetRoom);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text && !attachment) return;

    const targetRoom = conversation.id;
    stopTyping(conversation.id);
    if (conversation.name) stopTyping(conversation.name);

    if (editingMessage) {
      try {
        await messageService.editMessage(editingMessage.id, text);
        setEditingMessage(null);
        setMessageText('');
        toast.success('Message updated.');
      } catch (err) {
        toast.error('Failed to edit message.');
      }
      return;
    }

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Send via real-time WebSocket
    sendChatMessage({
      room: targetRoom,
      conversationId: conversation.id,
      message: text,
      type: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : 'file') : 'text',
      replyTo: replyingTo ? replyingTo.id : undefined,
      attachments: attachment ? [attachment] : undefined,
      idempotencyKey,
    });

    // If socket is disconnected, send via HTTP API immediately
    if (!isConnected) {
      try {
        await messageService.sendMessage(conversation.id, {
          content: text,
          type: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : 'file') : 'text',
          replyTo: replyingTo ? replyingTo.id : undefined,
          attachments: attachment ? [attachment] : undefined,
          idempotencyKey,
        });
      } catch (err) {
        toast.error('Failed to send message.');
      }
    }

    setMessageText('');
    setReplyingTo(null);
    setAttachment(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await userService.uploadFile(file);
      setAttachment(res.data);
      toast.success(`Attached ${res.data.name}`);
    } catch (err) {
      toast.error('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await messageService.deleteMessage(msgId);
      toast.success('Message deleted.');
    } catch (err) {
      toast.error('Failed to delete message.');
    }
  };

  const handleTogglePin = async (msgId: string) => {
    try {
      const res = await messageService.togglePin(msgId);
      toast.success(res.data.isPinned ? 'Message pinned.' : 'Message unpinned.');
    } catch (err) {
      toast.error('Failed to toggle pin.');
    }
  };

  // Filter messages by search if active
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Conversation Header */}
      <header
        style={{
          padding: 'var(--space-3) var(--space-6)',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation"
            style={{ display: 'none', color: 'var(--text-primary)' }}
            className="mobile-header-menu-btn"
          >
            <Menu size={20} />
          </button>

          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {conversation.type === 'channel' ? (
              <Hash size={20} />
            ) : conversation.type === 'group' ? (
              <Users size={20} />
            ) : (
              <Avatar
                src={conversation.otherParticipant?.avatar}
                name={conversation.otherParticipant?.displayName || conversation.name || 'User'}
                size="md"
              />
            )}
          </div>

          <div>
            <h1
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}
            >
              {conversation.type === 'direct'
                ? conversation.otherParticipant?.displayName || conversation.name
                : formatChannelName(conversation.name || '')}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {conversation.type === 'channel'
                ? `Public channel · ${conversation.description || 'Community discussion'}`
                : conversation.type === 'group'
                ? `Private group · Code: ${conversation.code || 'None'}`
                : `Direct message · @${conversation.otherParticipant?.username || 'user'}`}
            </p>
          </div>
        </div>

        {/* Header Action Buttons in Strict Order: 1. AI Catch Up, 2. Search, 3. Conversation Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* 1. AI Catch Up */}
          <button
            type="button"
            onClick={onOpenAISummary}
            title="Chatterly AI Catch Up — Instant Executive Summary"
            aria-label="Chatterly AI Catch Up"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-primary)',
              color: 'var(--text-on-primary)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 8px rgba(85, 169, 199, 0.3)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <img
              src="/chatterly-logo.jpg"
              alt="Chatterly AI"
              style={{ width: 14, height: 14, borderRadius: 3, objectFit: 'cover' }}
            />
            <span>AI Catch Up</span>
          </button>

          {/* 2. Search */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenSearch) onOpenSearch();
              else setIsSearchOpen(!isSearchOpen);
            }}
            title="Search messages, channels & members"
            aria-label="Search"
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isSearchOpen ? 'var(--bg-selected)' : 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Search size={16} />
          </button>

          {/* 3. Conversation Details (Media, Links & Docs) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenContextPanel();
            }}
            title="Conversation Details (Media, Links & Docs)"
            aria-label="Conversation details"
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
          >
            <SidebarIcon size={16} />
          </button>
        </div>
      </header>

      {/* In-Conversation Search Bar */}
      {isSearchOpen ? (
        <div
          style={{
            padding: '8px var(--space-6)',
            backgroundColor: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            placeholder="Search messages in this channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
          {searchQuery ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {displayedMessages.length} matches
            </span>
          ) : null}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {/* Message Timeline */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Load older messages button */}
        {hasMore ? (
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--brand-primary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
              }}
            >
              <ChevronUp size={14} />
              <span>{isLoadingMore ? 'Loading history...' : 'Load older messages'}</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-4) 0', color: 'var(--text-muted)', fontSize: '12px' }}>
            Beginning of conversation history
          </div>
        )}

        {displayedMessages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: 'var(--space-2)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              ✦
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No messages yet</div>
            <div style={{ fontSize: 'var(--font-size-xs)' }}>Say hello or share an update to start the discussion!</div>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isOwn = String(msg.senderId || msg.sender?.id || (msg.sender as any)?._id || '') === String(user?.id || '');
            const senderName = msg.sender?.displayName || msg.sender?.username || 'User';
            const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div
                key={msg.id}
                className="message-row"
                style={{
                  display: 'flex',
                  flexDirection: isOwn ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  position: 'relative',
                }}
              >
                {!isOwn ? (
                  <Avatar src={msg.sender?.avatar} name={senderName} size="md" />
                ) : null}

                <div
                  style={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Sender meta */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      marginBottom: '3px',
                      fontSize: '11px',
                    }}
                  >
                    {!isOwn ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{senderName}</span>
                    ) : null}
                    <span style={{ color: 'var(--text-muted)' }}>{timeStr}</span>
                    {isOwn && !msg.isDeleted ? (
                      <span title="Delivered" style={{ color: 'var(--brand-primary)', fontWeight: 700, fontSize: '10px' }}>
                        ✓✓
                      </span>
                    ) : null}
                    {msg.isEdited && !msg.isDeleted ? (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>
                    ) : null}
                  </div>

                  {/* Reply Reference Bubble */}
                  {msg.replyTo && !msg.isDeleted ? (
                    <div
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderLeft: '3px solid var(--brand-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <strong>{msg.replyTo.sender?.displayName || msg.replyTo.sender?.username}:</strong>{' '}
                      {msg.replyTo.isDeleted ? 'Deleted message' : msg.replyTo.content}
                    </div>
                  ) : null}

                  {/* Message Bubble adhering strictly to Mocha & Terracotta tokens */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: isOwn ? 'var(--bg-message-own)' : 'var(--bg-message-other)',
                      color: isOwn ? 'var(--text-on-primary)' : 'var(--text-primary)',
                      fontSize: 'var(--font-size-sm)',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                      boxShadow: 'var(--shadow-sm)',
                      fontStyle: msg.isDeleted ? 'italic' : 'normal',
                      opacity: msg.isDeleted ? 0.75 : 1,
                    }}
                  >
                    {msg.content}

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && !msg.isDeleted ? (
                      <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.attachments.map((att, idx) => (
                          <div key={idx}>
                            {att.mimeType.startsWith('image/') ? (
                              <a href={resolveMediaUrl(att.url)} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={resolveMediaUrl(att.url)}
                                  alt={att.name}
                                  loading="lazy"
                                  crossOrigin="anonymous"
                                  style={{
                                    maxWidth: '260px',
                                    maxHeight: '200px',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'block',
                                    objectFit: 'cover',
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                href={resolveMediaUrl(att.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.name}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-panel)',
                                  color: isOwn ? '#FFFFFF' : 'var(--text-primary)',
                                  textDecoration: 'none',
                                  fontSize: '12px',
                                }}
                              >
                                <FileText size={16} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {att.name} ({(att.size / 1024).toFixed(0)} KB)
                                </span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Emoji Reactions row */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {Object.entries(msg.reactions).map(([emoji, r]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          title={`Reacted by: ${r.users.join(', ')}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '12px',
                            backgroundColor: r.hasReacted ? 'var(--brand-soft)' : 'var(--bg-elevated)',
                            border: `1px solid ${r.hasReacted ? 'var(--brand-secondary)' : 'var(--border-default)'}`,
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span>{emoji}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Hover Action Toolbar */}
                {!msg.isDeleted ? (
                  <div
                    className="message-actions-toolbar"
                    style={{
                      display: 'none',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {/* Quick Reactions */}
                    {['👍', '❤️', '😂', '🎉'].map((em) => (
                      <button
                        key={em}
                        onClick={() => toggleReaction(msg.id, em)}
                        style={{ fontSize: '14px', padding: '2px' }}
                      >
                        {em}
                      </button>
                    ))}

                    <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-default)', margin: '0 2px' }} />

                    {/* Reply */}
                    <button
                      onClick={() => setReplyingTo(msg)}
                      title="Reply"
                      style={{ color: 'var(--text-secondary)', padding: '2px' }}
                    >
                      <Reply size={14} />
                    </button>

                    {/* Pin */}
                    <button
                      onClick={() => handleTogglePin(msg.id)}
                      title="Pin message"
                      style={{ color: 'var(--text-secondary)', padding: '2px' }}
                    >
                      <Pin size={14} />
                    </button>

                    {/* Edit if author */}
                    {isOwn ? (
                      <button
                        onClick={() => {
                          setEditingMessage(msg);
                          setMessageText(msg.content);
                        }}
                        title="Edit message"
                        style={{ color: 'var(--text-secondary)', padding: '2px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                    ) : null}

                    {/* Delete if author or admin */}
                    {isOwn || user?.role === 'admin' ? (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete message"
                        style={{ color: 'var(--status-error)', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}

                    {/* Report if other user */}
                    {!isOwn ? (
                      <button
                        onClick={() => onOpenReport(msg.id)}
                        title="Report inappropriate content"
                        style={{ color: 'var(--text-muted)', padding: '2px' }}
                      >
                        <Flag size={14} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-6) var(--space-4)',
          backgroundColor: 'var(--bg-panel)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        {/* Reply Preview Banner */}
        {replyingTo ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-elevated)',
              borderLeft: '3px solid var(--brand-primary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-2)',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>Replying to {replyingTo.sender?.displayName}:</span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>{replyingTo.content.slice(0, 60)}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        ) : null}

        {/* Edit banner */}
        {editingMessage ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-selected)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-2)',
              fontSize: '12px',
            }}
          >
            <span>Editing message (press Enter to save)</span>
            <button
              onClick={() => {
                setEditingMessage(null);
                setMessageText('');
              }}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {/* Attachment preview chip */}
        {attachment ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              marginBottom: 'var(--space-2)',
              fontSize: '12px',
            }}
          >
            <Paperclip size={13} color="var(--brand-primary)" />
            <span>{attachment.name}</span>
            <button onClick={() => setAttachment(null)} style={{ color: 'var(--text-muted)' }}>
              <X size={13} />
            </button>
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'var(--space-2)',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '6px 10px',
            position: 'relative',
          }}
        >
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach image or file"
            aria-label="Attach file"
            style={{
              padding: '6px',
              color: isUploading ? 'var(--text-muted)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
            }}
          >
            <Paperclip size={18} />
          </button>

          {/* Quick Emoji Popover */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Insert Emoji"
              aria-label="Insert emoji"
              style={{
                padding: '6px',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
              }}
            >
              <Smile size={18} />
            </button>

            {showEmojiPicker ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: '36px',
                  left: 0,
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '8px',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 20,
                }}
              >
                {quickEmojis.map((em) => (
                  <button
                    key={em}
                    onClick={() => {
                      setMessageText((prev) => prev + em);
                      setShowEmojiPicker(false);
                    }}
                    style={{ fontSize: '18px', padding: '2px' }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Input Textarea */}
          <textarea
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${conversation.name || 'conversation'}...`}
            rows={1}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.4,
              resize: 'none',
              maxHeight: '120px',
              padding: '6px 4px',
            }}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!messageText.trim() && !attachment}
            aria-label="Send message"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: messageText.trim() || attachment ? 'var(--brand-primary)' : 'var(--bg-elevated)',
              color: messageText.trim() || attachment ? 'var(--text-on-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color var(--transition-fast)',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>Max 5,000 characters</span>
        </div>
      </div>
    </main>
  );
};
