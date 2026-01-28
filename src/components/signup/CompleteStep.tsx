import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';

export const CompleteStep = () => {
  const navigate = useNavigate();
  const { resetSignup } = useSignup();

  const handleGoHome = () => {
    resetSignup();
    navigate('/');
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              You are all set
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Your signup request has been submitted. Once approved, you will
              appear in the member directory.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleGoHome}
            fullWidth
          >
            Go to homepage
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
