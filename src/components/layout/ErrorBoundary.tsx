import { Box, Button, Container, Typography } from '@mui/material';
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

export class ErrorBoundary extends Component<Props, State> {
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
    console.error('[SYSTEM ERROR]: Sector Mismatch:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            data-testid="error-boundary-fallback"
            sx={{
              mt: 10,
              p: 4,
              borderRadius: 4,
              bgcolor: 'rgba(30, 0, 0, 0.5)',
              border: '2px solid #ff4d4d',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              variant="h4"
              sx={{ color: '#ff4d4d', mb: 1.5, fontWeight: 700 }}
            >
              {this.state.copy.title}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', mb: 1.5 }}
            >
              {this.state.copy.description}
            </Typography>
            {this.state.copy.detail && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 3,
                  color: 'rgba(255,255,255,0.62)',
                  wordBreak: 'break-word',
                }}
              >
                Details: {this.state.copy.detail}
              </Typography>
            )}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 3,
                color: 'rgba(255,255,255,0.46)',
                letterSpacing: '0.08em',
              }}
            >
              Error code: {this.state.copy.code}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1.25,
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="contained"
                color="error"
                onClick={() => window.location.reload()}
                sx={{ fontWeight: 600 }}
              >
                Reload page
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => window.location.assign('/')}
                sx={{ fontWeight: 600 }}
              >
                Go to home
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
