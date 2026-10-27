import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { conversationService, userService } from '../../services/api.js';
import { useToast } from '../../components/ui/Toast.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { User } from '../../types/index.js';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchUsers = async (q: string) => {
    setSearchMember(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await userService.searchUsers(q);
      setSearchResults(res.data.users || []);
    } catch (err) {
      // ignore
    }
  };

  const getUserId = (u: any) => String(u?.id || u?._id || '');

  const handleToggleMember = (u: User) => {
    const targetId = getUserId(u);
    if (!targetId) return;

    if (selectedMembers.some((m) => getUserId(m) === targetId)) {
      setSelectedMembers((prev) => prev.filter((m) => getUserId(m) !== targetId));
    } else {
      setSelectedMembers((prev) => [...prev, u]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Group name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const memberIds = selectedMembers.map(getUserId).filter(Boolean);

      const res = await conversationService.createGroup({
        name: name.trim(),
        description: description.trim(),
        memberIds,
      });

      toast.success(`Group "${name}" created!`);
      onGroupCreated(res.data.group);
      onClose();
      setName('');
      setDescription('');
      setSelectedMembers([]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create group.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Private Group"
      description="Create a private channel and invite multiple team members."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Create Group
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input
          label="Group Name"
          placeholder="e.g. Frontend Architecture"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Description (Optional)"
          placeholder="What is this group about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <Input
            label="Invite Members"
            placeholder="Search by username or name to add members..."
            value={searchMember}
            onChange={(e) => handleSearchUsers(e.target.value)}
          />

          {searchResults.length > 0 ? (
            <div
              style={{
                marginTop: 'var(--space-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                maxHeight: '130px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              {searchResults.map((u) => {
                const uId = getUserId(u);
                const isSelected = selectedMembers.some((m) => getUserId(m) === uId);
                return (
                  <div
                    key={uId || u.username}
                    onClick={() => handleToggleMember(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-default)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Avatar name={u.displayName || u.username} size="sm" />
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>{u.displayName} (@{u.username})</span>
                    </div>
                    <span style={{ fontSize: '11px', color: isSelected ? 'var(--brand-primary)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                      {isSelected ? '✓ Added' : '+ Add'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Selected members chips */}
          {selectedMembers.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'var(--space-2)' }}>
              {selectedMembers.map((m) => {
                const mId = getUserId(m);
                return (
                  <span
                    key={mId || m.username}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--brand-soft)',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {m.displayName}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMember(m);
                      }}
                      style={{ cursor: 'pointer', color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: '0 2px' }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};
