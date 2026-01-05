import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { AdminModerationPage } from './AdminModerationPage';

export const AdminApp = () => {
  const [token, setToken] = useState('');
  const [activeToken, setActiveToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const masked = useMemo(() => {
    if (!activeToken) return '';
    if (activeToken.length <= 10) return '••••••••••';
    return `${activeToken.slice(0, 6)}••••••${activeToken.slice(-4)}`;
  }, [activeToken]);

  const onUseToken = () => {
    setError(null);
    const t = token.trim();
    if (!t) {
      setError('Enter an admin token (service role JWT) to continue.');
      return;
    }
    setActiveToken(t);
  };

  const onClearToken = () => {
    setToken('');
    setActiveToken('');
    setError(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin
      </Typography>

      <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
        Paste a service role token to access moderation tools locally.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <TextField
          label="Admin token"
          placeholder="SUPABASE_SERVICE_ROLE_KEY"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          fullWidth
          inputProps={{ 'aria-label': 'admin token' }}
        />
        <Button
          variant="contained"
          onClick={onUseToken}
          disabled={!token.trim()}
        >
          Use
        </Button>
        <Button
          variant="outlined"
          onClick={onClearToken}
          disabled={!token && !activeToken}
        >
          Clear
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {activeToken ? (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Using token: <strong>{masked}</strong>
          </Alert>
          <AdminModerationPage token={activeToken} />
        </>
      ) : (
        <Alert severity="warning">
          No token set. Paste your service role key to load the moderation
          dashboard.
        </Alert>
      )}
    </Container>
  );
};
