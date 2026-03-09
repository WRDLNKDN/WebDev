import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { identityStepOAuthNote } from '../../../theme/joinStyles';

const oauthButtonSx = {
  textTransform: 'none' as const,
  fontWeight: 600,
  py: 1.5,
  px: 2,
  minWidth: 200,
  whiteSpace: 'nowrap',
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.5)',
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.06)',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.8)',
    bgcolor: 'rgba(255,255,255,0.12)',
  },
  '&.Mui-disabled': {
    borderColor: 'rgba(255,255,255,0.25)',
    color: 'rgba(255,255,255,0.72)',
  },
};

type IdentityOAuthActionsProps = {
  canProceed: boolean;
  loading: boolean;
  loadingProvider: 'google' | 'azure' | null;
  onSignIn: (provider: 'google' | 'azure') => void;
};

export const IdentityOAuthActions = ({
  canProceed,
  loading,
  loadingProvider,
  onSignIn,
}: IdentityOAuthActionsProps) => (
  <>
    <Box
      sx={{
        ...identityStepOAuthNote,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        py: 1,
        px: 1.5,
        bgcolor: 'rgba(0, 200, 255, 0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderLeft: '4px solid #4ade80',
        borderRadius: '8px',
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: 'rgba(74, 222, 128, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1rem',
        }}
        aria-hidden
      >
        🔒
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
          minWidth: 0,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.95)',
          }}
        >
          Secure OAuth authentication
        </Typography>
        <Typography
          component="span"
          sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}
        >
          We never store your credentials.
        </Typography>
      </Box>
    </Box>

    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <Button
        variant="outlined"
        size="large"
        fullWidth
        onClick={() => onSignIn('google')}
        disabled={loading || !canProceed}
        startIcon={
          loadingProvider === 'google' ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <GoogleIcon />
          )
        }
        sx={oauthButtonSx}
      >
        {loadingProvider === 'google' ? 'Signing in…' : 'Sign in with Google'}
      </Button>
      <Button
        variant="outlined"
        size="large"
        fullWidth
        onClick={() => onSignIn('azure')}
        disabled={loading || !canProceed}
        startIcon={
          loadingProvider === 'azure' ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <MicrosoftIcon />
          )
        }
        sx={oauthButtonSx}
      >
        {loadingProvider === 'azure' ? 'Signing in…' : 'Sign in with Microsoft'}
      </Button>
    </Stack>
  </>
);
