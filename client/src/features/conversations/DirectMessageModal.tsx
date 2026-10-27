import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { conversationService, userService } from '../../services/api.js';
import { useToast } from '../../components/ui/Toast.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { User } from '../../types/index.js';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  onConversationCreated,
}) => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await userService.searchUsers(val);
      setResults(res.data.users || []);
    } catch (err) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDM = async (recipientId: string) => {
    setIsStarting(true);
    try {
      const res = await conversationService.getOrCreateDirect(recipientId);
      toast.success('Conversation opened.');
      onConversationCreated(res.data.conversationId);
      onClose();
      setQuery('');
      setResults([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start conversation.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start Direct Message"
      description="Find anyone on Chatterly by username or name to start a private conversation."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input
          label="Search Users"
          placeholder="Type a username or display name..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />

        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
              Searching Chatterly network...
            </div>
          ) : results.length > 0 ? (
            results.map((u) => {
              const targetUserId = String(u.id || (u as any)._id || '');
              return (
                <div
                  key={targetUserId || u.username}
                  onClick={() => {
                    if (!isStarting && targetUserId) {
                      handleStartDM(targetUserId);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    cursor: isStarting ? 'not-allowed' : 'pointer',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Avatar name={u.displayName || u.username} size="md" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {u.displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStarting}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isStarting && targetUserId) {
                        handleStartDM(targetUserId);
                      }
                    }}
                  >
                    Message
                  </Button>
                </div>
              );
            })
          ) : query ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
              No users found matching "{query}"
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: '12px' }}>
              Search for teammates or contacts to chat
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
