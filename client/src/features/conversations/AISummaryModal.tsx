import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { Button } from '../../components/ui/Button.js';
import { aiService } from '../../services/api.js';
import {
  CheckSquare,
  Lightbulb,
  Clock,
  HelpCircle,
  Calendar,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationName: string;
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationName,
}) => {
  const [scope, setScope] = useState<'recent-24h' | 'last-50' | 'all-unread'>('last-50');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    overview?: string;
    summary?: string;
    keyTopics?: string[];
    decisions?: string[];
    actionItems?: Array<{
      task: string;
      assignee?: string;
      deadline?: string;
      sourceRef?: string;
    }> | string[];
    deadlines?: string[];
    openQuestions?: string[];
    messageCount: number;
    scope?: string;
    engine?: string;
  } | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.summarizeConversation(conversationId, scope);
      setResult(res.data);
    } catch {
      setResult({
        overview: 'No sufficient messages found in this scope or unable to summarize.',
        messageCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Intelligent Conversation Catch-Up"
      description={`Generate structured executive digests, decisions, and action items for #${conversationName}`}
      maxWidth="640px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button variant="primary" onClick={handleGenerate} isLoading={isLoading}>
            {result ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={14} />
                Regenerate
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img
                  src="/chatterly-logo.jpg"
                  alt="Chatterly AI"
                  style={{ width: 14, height: 14, borderRadius: 2 }}
                />
                Generate Summary
              </span>
            )}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Scope Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Select Catch-Up Scope
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setScope('last-50')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${scope === 'last-50' ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                backgroundColor: scope === 'last-50' ? 'var(--bg-selected)' : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: scope === 'last-50' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              Last 50 Messages
            </button>
            <button
              type="button"
              onClick={() => setScope('recent-24h')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${scope === 'recent-24h' ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                backgroundColor: scope === 'recent-24h' ? 'var(--bg-selected)' : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: scope === 'recent-24h' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              Past 24 Hours
            </button>
            <button
              type="button"
              onClick={() => setScope('all-unread')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${scope === 'all-unread' ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                backgroundColor: scope === 'all-unread' ? 'var(--bg-selected)' : 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: scope === 'all-unread' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              All Unread
            </button>
          </div>
        </div>

        {/* Results View */}
        {result ? (
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            {/* Header info without internal debug labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-default)',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img
                  src="/chatterly-logo.jpg"
                  alt="Chatterly AI"
                  style={{ width: 15, height: 15, borderRadius: 3 }}
                />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Chatterly AI Catch Up Summary
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {result.messageCount} messages analyzed
              </span>
            </div>

            {/* 1. Overview */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                1. Executive Overview
              </h4>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {result.overview || result.summary}
              </p>
            </div>

            {/* 2. Key Topics */}
            {result.keyTopics && result.keyTopics.length > 0 ? (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  2. Key Topics Discussed
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.keyTopics.map((topic, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-default)',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 3. Decisions Agreed */}
            {result.decisions && result.decisions.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Lightbulb size={14} color="var(--brand-secondary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    3. Key Decisions Made
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {result.decisions.map((dec, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-panel)',
                        borderLeft: '3px solid var(--brand-secondary)',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {dec}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 4. Action Items & Assignees */}
            {result.actionItems && result.actionItems.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <CheckSquare size={14} color="var(--brand-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    4. Detected Action Items
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.actionItems.map((item, i) => {
                    const taskStr = typeof item === 'string' ? item : item.task;
                    const assignee = typeof item === 'object' ? item.assignee : undefined;
                    const deadline = typeof item === 'object' ? item.deadline : undefined;

                    return (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-panel)',
                          border: '1px solid var(--border-default)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {taskStr}
                        </div>
                        {(assignee || deadline) && (
                          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {assignee && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={11} /> {assignee}
                              </span>
                            )}
                            {deadline && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-primary)' }}>
                                <Calendar size={11} /> {deadline}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 5. Deadlines Mentioned */}
            {result.deadlines && result.deadlines.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Clock size={14} color="var(--brand-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    5. Deadlines Mentioned
                  </h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {result.deadlines.map((dl, i) => (
                    <li key={i}>{dl}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 6. Open Questions */}
            {result.openQuestions && result.openQuestions.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <HelpCircle size={14} color="var(--text-muted)" />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    6. Unresolved Questions
                  </h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {result.openQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-default)',
            }}
          >
            <img
              src="/chatterly-logo.jpg"
              alt="Chatterly AI"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                marginBottom: '10px',
                boxShadow: '0 2px 8px rgba(85, 169, 199, 0.3)',
                border: '1.5px solid rgba(85, 169, 199, 0.45)',
              }}
            />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Catch up on #{conversationName}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Choose a message scope above and click "Generate Summary" to extract key topics, decisions, and action items.
            </p>
          </div>
        )}

        {/* Privacy Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--status-online)" />
          <span>Summaries are computed strictly from authorized persisted messages in this conversation.</span>
        </div>
      </div>
    </Modal>
  );
};
