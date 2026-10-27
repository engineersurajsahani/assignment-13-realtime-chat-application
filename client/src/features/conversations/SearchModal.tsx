import React, { useState, useEffect } from 'react';
import { conversationService } from '../../services/api.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { resolveMediaUrl } from '../../utils/media.js';
import {
  Search,
  X,
  Hash,
  FileText,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  onStartDirectMessage?: (userId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
  onStartDirectMessage,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'messages' | 'people' | 'channels' | 'files'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    channels: any[];
    people: any[];
    messages: any[];
    files: any[];
  }>({
    channels: [],
    people: [],
    messages: [],
    files: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ channels: [], people: [], messages: [], files: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ channels: [], people: [], messages: [], files: [] });
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await conversationService.searchUniversal(trimmed);
        setResults(res.data);
      } catch {
        // fail gracefully
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.channels.length + results.people.length + results.messages.length + results.files.length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Search size={20} color="var(--brand-primary)" />
          <input
            autoFocus
            placeholder="Search messages, channels, people, files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--text-primary)',
            }}
          />
          {isLoading ? (
            <Loader2 size={18} className="spin" color="var(--brand-primary)" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          ) : null}
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ESC
          </button>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          {(['all', 'messages', 'people', 'channels', 'files'] as const).map((filter) => {
            const count =
              filter === 'all'
                ? totalResults
                : filter === 'messages'
                ? results.messages.length
                : filter === 'people'
                ? results.people.length
                : filter === 'channels'
                ? results.channels.length
                : results.files.length;

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: activeFilter === filter ? 600 : 400,
                  backgroundColor: activeFilter === filter ? 'var(--brand-primary)' : 'var(--bg-panel)',
                  color: activeFilter === filter ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${activeFilter === filter ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{filter}</span>
                {query.length >= 2 && <span style={{ opacity: 0.8, fontSize: '11px' }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {query.trim().length < 2 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Search size={32} color="var(--text-muted)" style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Search Chatterly
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Type at least 2 characters to search across conversations, contacts, and documents.
              </div>
            </div>
          ) : totalResults === 0 && !isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No results found for "{query}"
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Try searching with different keywords or check spelling.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* CHANNELS */}
              {(activeFilter === 'all' || activeFilter === 'channels') && results.channels.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Channels & Groups ({results.channels.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.channels.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectConversation(c.id);
                          onClose();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Hash size={16} color="var(--brand-primary)" />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{c.name}</div>
                            {c.description && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.description}</div>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} color="var(--text-muted)" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PEOPLE */}
              {(activeFilter === 'all' || activeFilter === 'people') && results.people.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    People ({results.people.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.people.map((p) => {
                      const personId = String(p.id || p._id || '');
                      return (
                        <div
                          key={personId || p.username}
                          onClick={() => {
                            if (onStartDirectMessage && personId) onStartDirectMessage(personId);
                            onClose();
                          }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar src={p.avatar} name={p.displayName || p.username} size="sm" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.displayName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{p.username}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                          Message
                        </span>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {(activeFilter === 'all' || activeFilter === 'messages') && results.messages.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Messages ({results.messages.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.messages.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          onSelectConversation(m.conversationId);
                          onClose();
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {m.sender?.displayName || m.sender?.username}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>in #{m.conversationName}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FILES */}
              {(activeFilter === 'all' || activeFilter === 'files') && results.files.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Files & Documents ({results.files.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.files.map((f) => (
                      <a
                        key={f.id}
                        href={resolveMediaUrl(f.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={f.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={16} color="var(--brand-primary)" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{f.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Shared by {f.sender?.displayName || 'User'}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                          Download
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
