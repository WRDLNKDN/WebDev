import { Box, Button, Container, Typography } from '@mui/material';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SYSTEM ERROR]: Sector Mismatch:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
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
              sx={{ color: '#ff4d4d', mb: 2, fontWeight: 700 }}
            >
              [SYSTEM_HALT]
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
              Logic mismatch detected in this sector. The Human OS has initiated
              a protective rewind.
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={() => window.location.assign('/')}
              sx={{ fontWeight: 600 }}
            >
              Restart Environment
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
