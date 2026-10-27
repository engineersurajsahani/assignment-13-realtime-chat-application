import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            height: '100%',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            margin: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--status-error)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0' }}>
            {this.props.fallbackTitle || 'Unable to load panel'}
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              maxWidth: '280px',
              margin: '0 0 16px 0',
              lineHeight: 1.4,
            }}
          >
            An unexpected error occurred while displaying this view. Your conversations and messages remain safe.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-primary)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'opacity var(--transition-fast)',
            }}
          >
            <RotateCcw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
