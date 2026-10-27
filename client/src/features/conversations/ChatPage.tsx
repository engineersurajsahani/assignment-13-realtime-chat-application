import React, { useState, useEffect, useCallback } from 'react';
import { Conversation, Message } from '../../types/index.js';
import { conversationService, messageService } from '../../services/api.js';
import { useSocket } from '../../app/SocketContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { NavigationSidebar } from './NavigationSidebar.js';
import { ConversationArea } from '../messages/ConversationArea.js';
import { PulseAIWorkspace } from '../ai/PulseAIWorkspace.js';
import { ContextPanel } from './ContextPanel.js';
import { CreateGroupModal } from '../groups/CreateGroupModal.js';
import { JoinGroupModal } from '../groups/JoinGroupModal.js';
import { DirectMessageModal } from './DirectMessageModal.js';
import { AISummaryModal } from './AISummaryModal.js';
import { SearchModal } from './SearchModal.js';
import { ReportModal } from '../moderation/ReportModal.js';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary.js';

interface ChatPageProps {
  onNavigateToSettings: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigateToSettings }) => {
  const { socket, joinRoom } = useSocket();
  const toast = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // Chatterly AI dedicated workspace state
  const [isAIActive, setIsAIActive] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Panels visibility
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  // Load user conversations
  const loadConversations = useCallback(async (selectId?: string) => {
    try {
      const res = await conversationService.getConversations();
      const list = res.data.conversations || [];
      setConversations(list);

      if (selectId) {
        const found = list.find((c) => String(c.id) === String(selectId));
        if (found) {
          setActiveConversation(found);
          setIsAIActive(false);
          return;
        }
      }

      // If no active conversation and not in AI mode, select general public channel or first
      setActiveConversation((prev) => {
        if (prev) {
          const updated = list.find((c) => c.id === prev.id);
          return updated || prev;
        }
        const general = list.find((c) => (c.name || '').toLowerCase() === 'general' && c.isPublicChannel);
        return general || list[0] || null;
      });
    } catch {
      toast.error('Failed to load conversations.');
    }
  }, [toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversation || isAIActive) return;

    // Join Socket.IO rooms for real-time messages (both conversation ID and name)
    joinRoom(activeConversation.id);
    if (activeConversation.name) {
      joinRoom(activeConversation.name);
      joinRoom(activeConversation.name.toLowerCase());
    }

    async function loadMessages() {
      try {
        const res = await messageService.getMessages(activeConversation!.id);
        setMessages(res.data.messages || []);
        setHasMore(res.data.hasMore);
        setNextCursor(res.data.nextCursor);

        // Clear unread count locally for this conversation
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation!.id ? { ...c, unreadCount: 0 } : c))
        );
      } catch {
        toast.error('Failed to load messages.');
      }
    }

    loadMessages();
  }, [activeConversation?.id, isAIActive, joinRoom, toast]);

  // Handle cursor-based pagination
  const handleLoadMore = async () => {
    if (!activeConversation || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await messageService.getMessages(activeConversation.id, nextCursor);
      setMessages((prev) => [...res.data.messages, ...prev]);
      setHasMore(res.data.hasMore);
      setNextCursor(res.data.nextCursor);
    } catch {
      toast.error('Failed to load older messages.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Socket event subscriptions
  useEffect(() => {
    if (!socket) return;

    const handleChatReceive = (msg: any) => {
      const msgConvId = String(msg.conversationId || msg.conversation?._id || msg.conversation || '');
      const activeConvId = String(activeConversation?.id || '');
      const activeName = (activeConversation?.name || '').toLowerCase();
      const msgRoom = String(msg.room || '').replace(/^#/, '').toLowerCase();

      const isCurrent =
        !isAIActive &&
        activeConversation &&
        (msgConvId === activeConvId ||
          (activeName && (activeName === msgRoom || activeName === String(msg.room || '').toLowerCase())) ||
          activeConvId === String(msg.room || ''));

      if (isCurrent) {
        setMessages((prev) => {
          const msgId = String(msg.id || msg._id || '');
          if (!msgId || prev.some((m) => String(m.id || (m as any)._id) === msgId)) return prev;
          const formatted = {
            ...msg,
            id: msgId,
            content: msg.content || msg.message || '',
          };
          return [...prev, formatted];
        });
      } else {
        // Increment unread count in sidebar
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === msg.conversationId || c.name === msg.room) {
              return { ...c, unreadCount: c.unreadCount + 1, lastMessageAt: msg.createdAt };
            }
            return c;
          })
        );
      }
    };

    const handleReactionUpdate = ({ messageId, reactions }: { messageId: string; reactions: any }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleNotification = (notif: any) => {
      toast.info(notif.content);
    };

    const handleProfileUpdate = (profileData: { userId: string; displayName?: string; avatar?: string }) => {
      // Propagate updated user avatar to message senders
      setMessages((prev) =>
        prev.map((m) => {
          const senderId = m.senderId || m.sender?.id || (m.sender as any)?._id;
          if (senderId === profileData.userId) {
            return {
              ...m,
              sender: {
                ...m.sender,
                displayName: profileData.displayName || m.sender?.displayName,
                avatar: profileData.avatar !== undefined ? profileData.avatar : m.sender?.avatar,
              },
            };
          }
          return m;
        })
      );

      // Propagate updated user avatar to conversation participants
      setConversations((prev) =>
        prev.map((c) => {
          if (c.otherParticipant?.id === profileData.userId) {
            return {
              ...c,
              otherParticipant: {
                ...c.otherParticipant,
                displayName: profileData.displayName || c.otherParticipant.displayName,
                avatar: profileData.avatar !== undefined ? profileData.avatar : c.otherParticipant.avatar,
              },
            };
          }
          return c;
        })
      );
    };

    socket.on('chat:receive', handleChatReceive);
    socket.on('reaction:update', handleReactionUpdate);
    socket.on('notification:new', handleNotification);
    socket.on('user:profile_updated', handleProfileUpdate);

    return () => {
      socket.off('chat:receive', handleChatReceive);
      socket.off('reaction:update', handleReactionUpdate);
      socket.off('notification:new', handleNotification);
      socket.off('user:profile_updated', handleProfileUpdate);
    };
  }, [socket, activeConversation, isAIActive, toast]);

  const handleSelectConversation = (conv: Conversation) => {
    setIsAIActive(false);
    setActiveConversation(conv);
    setIsMobileSidebarOpen(false);
  };

  const handleSelectAI = () => {
    setIsAIActive(true);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Left Navigation Sidebar & Icon Rail */}
      <NavigationSidebar
        conversations={conversations}
        activeConversationId={!isAIActive ? activeConversation?.id || null : null}
        onSelectConversation={handleSelectConversation}
        onSelectAI={handleSelectAI}
        isAIActive={isAIActive}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenJoinGroup={() => setIsJoinGroupOpen(true)}
        onOpenDirectMessage={() => setIsDirectMessageOpen(true)}
        onOpenSettings={onNavigateToSettings}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Center Area: Either Pulse AI Workspace OR Active Conversation Area */}
      {isAIActive ? (
        <PulseAIWorkspace />
      ) : activeConversation ? (
        <ConversationArea
          conversation={activeConversation}
          messages={messages}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          onOpenContextPanel={() => setIsContextOpen(!isContextOpen)}
          onOpenAISummary={() => setIsAISummaryOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenReport={(msgId) => setReportTargetId(msgId)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          Select a channel, conversation, or launch Chatterly AI from the sidebar
        </div>
      )}

      {/* Collapsible Right Context Panel (Media, Links & Docs) */}
      {!isAIActive && isContextOpen && activeConversation ? (
        <ErrorBoundary
          fallbackTitle="Conversation Details Unavailable"
          onReset={() => setIsContextOpen(false)}
        >
          <ContextPanel
            conversation={activeConversation}
            onClose={() => setIsContextOpen(false)}
            onConversationUpdated={loadConversations}
            pinnedMessages={[]}
          />
        </ErrorBoundary>
      ) : null}

      {/* Universal Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectConversation={(conversationId) => {
          setIsSearchOpen(false);
          const target = conversations.find((c) => c.id === conversationId);
          if (target) {
            setActiveConversation(target);
            setIsAIActive(false);
          } else {
            loadConversations();
          }
        }}
        onStartDirectMessage={async (userId) => {
          setIsSearchOpen(false);
          try {
            const res = await conversationService.getOrCreateDirect(userId);
            const convsRes = await conversationService.getConversations();
            const list = convsRes.data.conversations || [];
            setConversations(list);
            const found = list.find((c) => c.id === res.data.conversationId);
            if (found) {
              setActiveConversation(found);
            }
            setIsAIActive(false);
          } catch {
            toast.error('Could not initiate direct message.');
          }
        }}
      />

      {/* Interactive Modals (Group, DM, AI Summary, Moderation) */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(g) => {
          const gId = g?.id || g?._id;
          loadConversations(gId);
          setIsAIActive(false);
        }}
      />

      <JoinGroupModal
        isOpen={isJoinGroupOpen}
        onClose={() => setIsJoinGroupOpen(false)}
        onJoined={(g) => {
          const gId = g?.id || g?._id;
          loadConversations(gId);
          setIsAIActive(false);
        }}
      />

      <DirectMessageModal
        isOpen={isDirectMessageOpen}
        onClose={() => setIsDirectMessageOpen(false)}
        onConversationCreated={(convId) => {
          loadConversations(convId);
          setIsAIActive(false);
        }}
      />

      {activeConversation ? (
        <AISummaryModal
          isOpen={isAISummaryOpen}
          onClose={() => setIsAISummaryOpen(false)}
          conversationId={activeConversation.id}
          conversationName={activeConversation.name || 'Conversation'}
        />
      ) : null}

      {reportTargetId ? (
        <ReportModal
          isOpen={!!reportTargetId}
          onClose={() => setReportTargetId(null)}
          targetId={reportTargetId}
        />
      ) : null}
    </div>
  );
};
