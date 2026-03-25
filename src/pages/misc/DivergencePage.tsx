import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { WeirdlingRunner } from '../../components/games/WeirdlingRunner';
import { getGlassCard, SIGNUP_BG } from '../../theme/candyStyles';

export const DivergencePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={SIGNUP_BG}>
      <Container maxWidth="md">
        <Box
          sx={{
            ...getGlassCard(theme),
            p: 6,
            textAlign: 'center',
            border: '1px solid #f06292', // Pink border to signal "Easter Egg" mode
            boxShadow: '0 0 30px rgba(240, 98, 146, 0.2)',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: '#f06292',
              mb: 1,
            }}
          >
            DIVERGENCE_PROTOCOL
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              mb: 4,
            }}
          >
            Restricted Sector Access Granted.
          </Typography>

          <Typography
            variant="body1"
            sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}
          >
            The requested profile has initiated **Pathological Homeostasis** and
            refuses to load. While we perform a **System Audit**, please
            maintain your own **Activation Energy** below.
          </Typography>

          <Box sx={{ mb: 4 }}>
            <WeirdlingRunner />
          </Box>

          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            sx={{
              borderColor: 'rgba(141,188,229,0.50)',
              color: 'white',
              '&:hover': {
                borderColor: '#FFFFFF',
                bgcolor: 'rgba(56,132,210,0.12)',
              },
            }}
          >
            Exit Protocol (Return Home)
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

// Default export for lazy loading
export default DivergencePage;
