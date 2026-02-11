import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  completeStepStack,
  completeStepSubtext,
  completeStepTitle,
  signupPaper,
} from '../../theme/signupStyles';
import { useSignup } from '../../context/useSignup';

export const CompleteStep = () => {
  const navigate = useNavigate();
  const { resetSignup } = useSignup();

  const handleGoDashboard = () => {
    resetSignup();
    navigate('/dashboard');
  };

  // On completion, gently transition the user into the product without extra clicks.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetSignup();
      navigate('/dashboard');
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [navigate, resetSignup]);

  return (
    <Container maxWidth="sm">
      <Paper elevation={0} sx={signupPaper}>
        <Stack spacing={3} sx={completeStepStack}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={completeStepTitle}>
              You&apos;re in
            </Typography>
            <Typography variant="body2" sx={completeStepSubtext}>
              Your signup request has been submitted. We&apos;ll review it soon.
              In the meantime, you can explore your dashboard and the directory
              without needing to do anything else.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleGoDashboard}
            fullWidth
          >
            Go to your dashboard now
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
