import { Box, Button, Paper, Stack, Typography } from '@mui/material';
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
    <Box sx={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Paper
        elevation={0}
        sx={{
          ...signupPaper,
          maxWidth: 480,
          mx: 'auto',
        }}
      >
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
            Share your intent and create your profile to join the community.
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
    </Box>
  );
};
