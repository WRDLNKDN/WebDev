import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GLASS_CARD, SIGNUP_BG } from '../theme/candyStyles';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={SIGNUP_BG}>
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            ...GLASS_CARD,
            p: 6,
            textAlign: 'center',
            zIndex: 1,
            // Subtle red glow for error state
            boxShadow: '0 18px 60px rgba(211, 47, 47, 0.15)',
          }}
        >
          <Stack spacing={4} alignItems="center">
            <Typography
              variant="h1"
              sx={{
                fontSize: '6rem',
                fontWeight: 900,
                opacity: 0.2,
                letterSpacing: -5,
              }}
            >
              404
            </Typography>

            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: -1,
                  mb: 1,
                  background: 'linear-gradient(45deg, #fff 30%, #ef5350 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                SYSTEM_DESYNC
              </Typography>
              <Typography
                variant="body1"
                sx={{ opacity: 0.7, maxWidth: 350, mx: 'auto' }}
              >
                The sector you are attempting to access could not be verified.
                It may have been archived during the last **System Audit**.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{
                  bgcolor: '#fff',
                  color: '#000',
                  '&:hover': { bgcolor: '#e0e0e0' },
                }}
              >
                Return to Dashboard
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { borderColor: '#fff' },
                }}
              >
                Back to Home
              </Button>
            </Stack>

            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                opacity: 0.3,
                letterSpacing: 2,
              }}
            >
              ERR_ADDRESS_UNREACHABLE
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

// Default export for lazy loading
export default NotFoundPage;
