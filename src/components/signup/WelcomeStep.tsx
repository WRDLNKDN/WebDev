import {
    Box,
    Button,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useSignup } from '../../context/useSignup';
import './signup.css';
import './WelcomeStep.css';

export const WelcomeStep = () => {
  const { goToStep } = useSignup();

  return (
    <Container maxWidth="sm">
      <Paper elevation={0} className="signupPaper">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" className="welcomeStepTitle">
              Welcome to WRDLNKDN
            </Typography>
            <Typography variant="body2" className="welcomeStepSubtext">
              Professional networking, but human.
            </Typography>
          </Box>

          <Typography variant="body2" className="welcomeStepDescription">
            This is a curated directory. You submit a request, admins review it,
            and once approved you appear in the member list.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => goToStep('identity')}
          >
            Start signup
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
