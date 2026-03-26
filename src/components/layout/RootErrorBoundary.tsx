import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { toMessage } from '../../lib/utils/errors';
import {
  buildErrorBoundaryCopy,
  type ErrorBoundaryCopy,
} from './errorBoundaryCopy';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  copy: ErrorBoundaryCopy;
}

export class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    copy: buildErrorBoundaryCopy(null),
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      copy: buildErrorBoundaryCopy(toMessage(error)),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ROOT ERROR]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main
          data-testid="error-boundary-fallback"
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            background: '#05070f',
            color: '#FFFFFF',
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
              {this.state.copy.title}
            </h1>
            <p
              style={{ color: 'rgba(255,255,255,0.78)', margin: '0 0 1.5rem' }}
            >
              {this.state.copy.description}
            </p>
            {this.state.copy.detail && (
              <p
                style={{
                  color: 'rgba(255,255,255,0.62)',
                  margin: '0 0 1rem',
                  wordBreak: 'break-word',
                  fontSize: '0.82rem',
                }}
              >
                Details: {this.state.copy.detail}
              </p>
            )}
            <p
              style={{
                color: 'rgba(255,255,255,0.46)',
                margin: '0 0 1.5rem',
                letterSpacing: '0.08em',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
              }}
            >
              Error code: {this.state.copy.code}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                role="button"
                tabIndex={0}
                onClick={() => window.location.reload()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.location.reload();
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
                  color: '#FFFFFF',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Reload page
              </span>
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
                  border: '1px solid rgba(255,255,255,0.26)',
                  borderRadius: '999px',
                  padding: '0.85rem 1.4rem',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Go to home
              </span>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
