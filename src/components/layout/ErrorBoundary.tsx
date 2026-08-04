import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { reportError } from '../../data/errorReporter';

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
    // Persist locally: the fallback's only action is a reload, which would
    // otherwise destroy the only record of what happened.
    reportError({ kind: 'render', error, componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
          <div className="compartment border border-[var(--loss)]/50 rounded-xl max-w-lg w-full p-8 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--loss)]/10 text-[var(--loss)] mb-6">
              <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-[var(--fg)] mb-3">
              Oops! Something went wrong.
            </h2>
            
            <p className="text-[var(--fg-dim)] mb-6">
              The app hit an error it could not recover from. Your data is safe — it
              stays in this browser. The details were saved to a local error log you
              can copy from Hands → Data Health after reloading.
            </p>

            {this.state.error && (
              <div className="mb-6 bg-[var(--ink-1)] rounded-lg p-4 text-left overflow-x-auto border border-[var(--hairline)]">
                <code className="text-xs font-mono text-[var(--loss)] whitespace-pre-wrap">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-all active:scale-95"
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
