import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { WeirdlingRunner } from '../../components/games/WeirdlingRunner';
import { GLASS_CARD, SIGNUP_BG } from '../../theme/candyStyles';

export const DivergencePage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={SIGNUP_BG}>
      <Container maxWidth="md">
        <Box
          sx={{
            ...GLASS_CARD,
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
              fontFamily: 'monospace',
            }}
          >
            DIVERGENCE_PROTOCOL
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              mb: 4,
              fontFamily: 'monospace',
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
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '&:hover': {
                borderColor: '#fff',
                bgcolor: 'rgba(255,255,255,0.05)',
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
