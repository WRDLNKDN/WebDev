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
import './CompleteStep.css';
import './signup.css';

export const CompleteStep = () => {
  const navigate = useNavigate();
  const { resetSignup } = useSignup();

  const handleGoHome = () => {
    resetSignup();
    navigate('/');
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={0} className="signupPaper completeStep">
        <Stack spacing={3} className="completeStepStack">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" className="completeStepTitle">
              You are all set
            </Typography>
            <Typography variant="body2" className="completeStepSubtext">
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
