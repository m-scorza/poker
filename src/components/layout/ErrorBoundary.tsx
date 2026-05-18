import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)]">
          <div className="glass-card border border-[var(--color-danger)]/50 rounded-xl max-w-lg w-full p-8 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] mb-6">
              <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">
              Oops! Something went wrong.
            </h2>
            
            <p className="text-[var(--color-text-dim)] mb-6">
              The application encountered a critical error and cannot continue. Our robot assistant (that's me) apologizes.
            </p>

            {this.state.error && (
              <div className="mb-6 bg-[var(--color-bg-input)] rounded-lg p-4 text-left overflow-x-auto border border-[var(--color-border)]">
                <code className="text-xs font-data text-[var(--color-danger)] whitespace-pre-wrap">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-all active:scale-95"
            >
              <RefreshCcw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
