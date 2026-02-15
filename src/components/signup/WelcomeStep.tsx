import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  signupPaper,
  welcomeStepDescription,
  welcomeStepSubtext,
  welcomeStepTitle,
} from '../../theme/signupStyles';
import { useSignup } from '../../context/useSignup';

export const WelcomeStep = () => {
  const { goToStep, markComplete } = useSignup();

  return (
    <Container maxWidth="sm">
      <Paper elevation={0} sx={signupPaper}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={welcomeStepTitle}>
              Start with intent.
            </Typography>
            <Typography variant="body2" sx={welcomeStepSubtext}>
              Business, but weirder. And built with care.
            </Typography>
          </Box>

          <Typography variant="body2" sx={welcomeStepDescription}>
            Tell us what brings you here and how you want to contribute. We
            review submissions to protect the culture and the humans in it.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => {
              markComplete('welcome');
              goToStep('identity');
            }}
          >
            Create your profile
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
