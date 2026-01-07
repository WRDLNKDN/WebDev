// src/admin/admin/adminApp.tsx
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
import type { ProfileStatus } from '../types/types';

type Props = {
  token?: string;
  initialStatus?: ProfileStatus | 'all';
};

export const AdminApp = ({
  token: tokenProp = '',
  initialStatus = 'pending',
}: Props) => {
  const [token, setToken] = useState(tokenProp);
  const [activeToken, setActiveToken] = useState(tokenProp);
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
      setError('Enter an admin token to continue.');
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
        Paste an admin token to access moderation tools.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <TextField
          label="Admin token"
          placeholder="ADMIN_TOKEN"
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
          <AdminModerationPage
            token={activeToken}
            initialStatus={initialStatus}
          />
        </>
      ) : (
        <Alert severity="warning">
          No token set. Paste your admin token to load the moderation dashboard.
        </Alert>
      )}
    </Container>
  );
};
