import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: '1rem', padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Something went wrong</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--col-muted)', maxWidth: 400 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 20px', background: 'var(--col-primary)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
