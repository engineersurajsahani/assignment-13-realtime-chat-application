import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { conversationService } from '../../services/api.js';
import { useToast } from '../../components/ui/Toast.js';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (group: any) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ isOpen, onClose, onJoined }) => {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter an invitation code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await conversationService.joinGroup(cleanCode);
      toast.success(`Joined group "${res.data.group.name}" successfully!`);
      onJoined(res.data.group);
      onClose();
      setCode('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid invitation code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Private Group"
      description="Enter the 6-character invitation code provided by the group creator."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Join Group
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Invitation Code"
          placeholder="e.g. 8K2M9P"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
};
