import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ROOT ERROR]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            background: '#05070f',
            color: '#fff',
          }}
        >
          <section
            style={{
              width: 'min(32rem, 100%)',
              borderRadius: '24px',
              border: '2px solid #ff4d4d',
              background: 'rgba(30, 0, 0, 0.5)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ color: '#ff4d4d', margin: '0 0 1rem' }}>
              [SYSTEM_HALT]
            </h1>
            <p
              style={{ color: 'rgba(255,255,255,0.78)', margin: '0 0 1.5rem' }}
            >
              Logic mismatch detected in this sector. The Human OS has initiated
              a protective rewind.
            </p>
            <span
              role="button"
              tabIndex={0}
              onClick={() => window.location.assign('/')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  window.location.assign('/');
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 0,
                borderRadius: '999px',
                padding: '0.85rem 1.4rem',
                background: '#ff4d4d',
                color: '#fff',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Restart Environment
            </span>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
