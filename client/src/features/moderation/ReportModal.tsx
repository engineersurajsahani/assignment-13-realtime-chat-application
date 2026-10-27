import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { Input } from '../../components/ui/Input.js';
import { Button } from '../../components/ui/Button.js';
import { moderationService } from '../../services/api.js';
import { useToast } from '../../components/ui/Toast.js';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, targetId }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please specify a reason for this report.');
      return;
    }

    setIsLoading(true);
    try {
      await moderationService.submitReport({
        targetType: 'message',
        targetId,
        reason: reason.trim(),
      });
      toast.success('Report submitted to Chatterly moderation team.');
      onClose();
      setReason('');
    } catch (err) {
      toast.error('Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Content"
      description="Help maintain a safe and respectful community by reporting policy violations."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} isLoading={isLoading}>
            Submit Report
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Input
          label="Violation Details"
          placeholder="e.g. Harassment, spam, or inappropriate language"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
};
