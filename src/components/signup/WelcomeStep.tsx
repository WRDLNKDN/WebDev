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
              Welcome to WRDLNKDN
            </Typography>
            <Typography variant="body2" sx={welcomeStepSubtext}>
              Professional networking, but human.
            </Typography>
          </Box>

          <Typography variant="body2" sx={welcomeStepDescription}>
            This is a curated directory. You submit a request, admins review it,
            and once approved you appear in the member list.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => {
              markComplete('welcome');
              goToStep('identity');
            }}
          >
            Start signup
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
