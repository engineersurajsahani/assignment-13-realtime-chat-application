import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../app/AuthContext.js';
import { aiService, userService } from '../../services/api.js';
import { useToast } from '../../components/ui/Toast.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { resolveMediaUrl } from '../../utils/media.js';
import {
  Send,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Code2,
  BookOpen,
  Lightbulb,
  Terminal,
  Paperclip,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachment?: {
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  };
}

const STARTER_PROMPTS = [
  {
    icon: Code2,
    title: 'Explain WebSockets vs SSE',
    prompt: 'Can you compare WebSockets and Server-Sent Events (SSE) for a real-time messaging application with code examples?',
  },
  {
    icon: Lightbulb,
    title: 'Architecture advice',
    prompt: 'How should I structure database indexing and caching for high-concurrency group chats in MongoDB?',
  },
  {
    icon: Terminal,
    title: 'Debug React re-renders',
    prompt: 'What are the most common causes of duplicate message renders in React when listening to Socket.IO events?',
  },
  {
    icon: BookOpen,
    title: 'Draft release announcement',
    prompt: 'Draft a professional release note announcing Chatterly v2.0 with Slate & Arctic Cyan UI and conversational AI.',
  },
];

export const PulseAIWorkspace: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chatterly_ai_history') || localStorage.getItem('pulsechat_ai_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: `👋 Hello **${user?.displayName || 'there'}**! I'm **Chatterly AI**, your integrated engineering and product assistant.\n\nI can help you:\n- **Answer programming doubts** & debug code\n- **Explain complex architectures** & system designs\n- **Brainstorm product features** & draft communications\n- **Analyze conversation patterns**\n\nHow can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Attachment state for AI queries
  const [attachment, setAttachment] = useState<{
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('chatterly_ai_history', JSON.stringify(messages));
    } catch {
      // ignore
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
    } catch {
      toast.error('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if ((!text && !attachment) || isLoading || isUploading) return;

    const currentAttachment = attachment;
    const userMsg: AIMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text || `Analyze attached file: ${currentAttachment?.name}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: currentAttachment || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiService.chatWithAI(
        text || `Analyze attached file: ${currentAttachment?.name}`,
        historyPayload,
        currentAttachment || undefined
      );
      const assistantReply = res.data.reply || 'I processed your request.';

      const assistantMsg: AIMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error('Chatterly AI encountered an error processing your query.');
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ I encountered an error communicating with the AI service. If you are running locally without an external `GEMINI_API_KEY`, the built-in engineering assistant engine is active. Please try again or rephrase your question.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleResetConversation = () => {
    if (!confirm('Start a fresh Chatterly AI conversation? Current messages will be cleared.')) return;
    const initial: AIMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: `Fresh session started. What topic or challenge would you like to explore, **${user?.displayName || 'friend'}**?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initial]);
    localStorage.removeItem('chatterly_ai_history');
    localStorage.removeItem('pulsechat_ai_history');
    toast.success('AI conversation reset.');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Response copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(input);
    }
  };

  // Simple Markdown renderer for headings, code blocks, lists, bold text
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = line.replace('```', '').trim();
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <div
              key={`code-${index}`}
              style={{
                margin: '10px 0',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {codeLang ? (
                <div
                  style={{
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'var(--brand-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-default)',
                    textTransform: 'uppercase',
                  }}
                >
                  {codeLang}
                </div>
              ) : null}
              <pre
                style={{
                  padding: '12px',
                  margin: 0,
                  fontSize: '12px',
                  fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                <code>{codeBuffer.join('\n')}</code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={index}
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '10px 0 4px',
            }}
          >
            {line.replace('### ', '')}
          </h4>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={index}
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--brand-primary)',
              margin: '12px 0 6px',
            }}
          >
            {line.replace('## ', '')}
          </h3>
        );
        return;
      }

      // Bullet lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        elements.push(
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '8px',
              marginLeft: '4px',
              marginBottom: '4px',
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>•</span>
            <span>{formatInlineMarkdown(itemText)}</span>
          </div>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={index} style={{ height: '8px' }} />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p
          key={index}
          style={{
            margin: '4px 0',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
          }}
        >
          {formatInlineMarkdown(line)}
        </p>
      );
    });

    return elements;
  };

  const formatInlineMarkdown = (text: string) => {
    // Basic bold **text** and inline `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--brand-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div
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
      {/* AI Workspace Header */}
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
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(85, 169, 199, 0.3)',
              border: '1.5px solid rgba(85, 169, 199, 0.45)',
              flexShrink: 0,
            }}
          >
            <img
              src="/chatterly-logo.jpg"
              alt="Chatterly AI"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                Chatterly AI
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--brand-soft)',
                  color: 'var(--brand-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Zap size={10} />
                Intelligent Assistant
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Ask programming questions, brainstorm features, and analyze architectures
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={handleResetConversation}
            title="Start fresh AI session"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <RotateCcw size={14} />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* Messages Timeline */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {/* Starter Prompt Cards (shown when message history is low) */}
        {messages.length <= 2 ? (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-3)',
              }}
            >
              Suggested prompts to try:
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {STARTER_PROMPTS.map((starter, i) => {
                const IconComponent = starter.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSendPrompt(starter.prompt)}
                    disabled={isLoading}
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconComponent size={16} color="var(--brand-primary)" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {starter.title}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      {starter.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Message stream */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              {isUser ? (
                <Avatar
                  src={user?.avatar}
                  name={user?.displayName || 'User'}
                  size="md"
                />
              ) : (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-sm)',
                    border: '1.5px solid rgba(85, 169, 199, 0.45)',
                  }}
                >
                  <img
                    src="/chatterly-logo.jpg"
                    alt="Chatterly AI"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div
                style={{
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Meta */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: '4px',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isUser ? user?.displayName || 'You' : 'Chatterly AI'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                </div>

                {/* Bubble */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isUser ? 'var(--bg-message-own)' : 'var(--bg-panel)',
                    color: isUser ? 'var(--text-on-primary)' : 'var(--text-primary)',
                    border: isUser ? 'none' : '1px solid var(--border-default)',
                    fontSize: 'var(--font-size-sm)',
                    boxShadow: 'var(--shadow-sm)',
                    width: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  {/* Attached file/image rendering */}
                  {msg.attachment ? (
                    <div style={{ marginBottom: '10px' }}>
                      {msg.attachment.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(msg.attachment.name) ? (
                        <div style={{ marginBottom: '8px', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: '220px' }}>
                          <img
                            src={resolveMediaUrl(msg.attachment.url)}
                            alt={msg.attachment.name}
                            loading="lazy"
                            crossOrigin="anonymous"
                            style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block', borderRadius: 'var(--radius-md)' }}
                          />
                        </div>
                      ) : null}
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isUser ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-elevated)',
                          border: isUser ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <FileText size={18} color={isUser ? '#FFFFFF' : 'var(--brand-primary)'} />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: isUser ? '#FFFFFF' : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {msg.attachment.name}
                            </div>
                            {msg.attachment.size ? (
                              <div style={{ fontSize: '10px', opacity: 0.8, color: isUser ? '#FFFFFF' : 'var(--text-muted)' }}>
                                {formatFileSize(msg.attachment.size)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <a
                          href={resolveMediaUrl(msg.attachment.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={msg.attachment.name}
                          title="Open attachment"
                          style={{
                            color: isUser ? '#FFFFFF' : 'var(--brand-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                          }}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  ) : (
                    <div>{renderFormattedContent(msg.content)}</div>
                  )}

                  {!isUser ? (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy response"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'transparent',
                        }}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={13} color="var(--status-online)" />
                            <span style={{ color: 'var(--status-online)' }}>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading ? (
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1.5px solid rgba(85, 169, 199, 0.45)',
              }}
            >
              <img
                src="/chatterly-logo.jpg"
                alt="Chatterly AI"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              <img
                src="/chatterly-logo.jpg"
                alt="Chatterly AI"
                style={{ width: 14, height: 14, borderRadius: 3, objectFit: 'cover' }}
              />
              <span>Chatterly AI is generating a response...</span>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-6) var(--space-4)',
          backgroundColor: 'var(--bg-panel)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        {/* Attachment preview chip */}
        {attachment ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-accent)',
              marginBottom: '8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
          >
            <Paperclip size={13} color="var(--brand-primary)" />
            <span style={{ fontWeight: 600 }}>{attachment.name}</span>
            {attachment.size ? (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ({formatFileSize(attachment.size)})
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setAttachment(null)}
              title="Remove attachment"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                marginLeft: '4px',
              }}
            >
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
            padding: '8px 12px',
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
            disabled={isUploading || isLoading}
            title="Attach code file, image, or document"
            aria-label="Attach file to AI query"
            style={{
              padding: '6px',
              color: isUploading ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: isUploading || isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '2px',
              flexShrink: 0,
            }}
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachment
                ? `Ask Chatterly AI a question about "${attachment.name}"...`
                : 'Ask Chatterly AI anything (code, debugging, explanations)...'
            }
            rows={1}
            disabled={isLoading || isUploading}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.45,
              resize: 'none',
              maxHeight: '120px',
              padding: '4px 0',
            }}
          />

          <button
            type="button"
            onClick={() => handleSendPrompt(input)}
            disabled={(!input.trim() && !attachment) || isLoading || isUploading}
            aria-label="Send query to AI"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              backgroundColor:
                (input.trim() || attachment) && !isLoading && !isUploading
                  ? 'var(--brand-primary)'
                  : 'var(--bg-elevated)',
              color:
                (input.trim() || attachment) && !isLoading && !isUploading
                  ? 'var(--text-on-primary)'
                  : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <span>Shift + Enter for new line · Enter to send</span>
          <span>Powered by Chatterly Intelligence Engine · Gemini AI</span>
        </div>
      </div>
    </div>
  );
};
