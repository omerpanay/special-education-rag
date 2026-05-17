import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SENSEI ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => window.location.reload();
  handleHome   = () => { window.location.href = '/'; }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0F1419', padding: 32, textAlign: 'center', gap: 24,
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(224,122,95,0.1)', border: '1px solid rgba(224,122,95,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={36} color="#E07A5F" />
        </div>

        {/* Heading */}
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#E8ECF1', margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#8899A6', marginTop: 8, fontSize: '0.95rem' }}>
            An unexpected error occurred in the application.
          </p>
        </div>

        {/* Error detail (collapsible) */}
        {this.state.error && (
          <details style={{ maxWidth: 540, textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', color: '#556677', fontSize: '0.8rem', marginBottom: 8 }}>
              Error details
            </summary>
            <pre style={{
              background: 'rgba(224,122,95,0.06)', border: '1px solid rgba(224,122,95,0.2)',
              borderRadius: 8, padding: '12px 16px', fontSize: '0.75rem',
              color: '#E8A090', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={this.handleReload}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: '#4F6D7A', color: '#fff',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={16} /> Reload Page
          </button>
          <button
            onClick={this.handleHome}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#8899A6',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Home size={16} /> Go Home
          </button>
        </div>
      </div>
    );
  }
}
