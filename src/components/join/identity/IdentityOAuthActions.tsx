import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  identityStepOAuthNote,
  joinFlowSecondaryButtonSx,
} from '../../../theme/joinStyles';

const oauthButtonSx = {
  ...joinFlowSecondaryButtonSx,
  py: 1.35,
  px: 2,
  minWidth: 200,
  whiteSpace: 'nowrap' as const,
  justifyContent: 'center',
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
        border: '1px solid rgba(156,187,217,0.22)',
        borderLeft: '4px solid #A744C2',
        borderRadius: '8px',
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: 'rgba(167, 68, 194, 0.22)',
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
        variant="contained"
        disableElevation
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
        variant="contained"
        disableElevation
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
