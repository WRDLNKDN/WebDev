import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import {
  joinFlowPrimaryButtonSx,
  signupPaper,
  welcomeStepDescription,
  welcomeStepSubtext,
  welcomeStepTitle,
} from '../../theme/joinStyles';
import { useJoin } from '../../context/useJoin';

export const WelcomeStep = () => {
  const { goToStep, markComplete } = useJoin();

  return (
    <Box sx={{ width: '100%', minWidth: 0, overflow: 'visible' }}>
      <Paper
        elevation={0}
        sx={{
          ...signupPaper,
          maxWidth: 480,
          mx: 'auto',
        }}
      >
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
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
            disableElevation
            fullWidth
            size="large"
            onClick={() => {
              markComplete('welcome');
              goToStep('identity');
            }}
            sx={joinFlowPrimaryButtonSx}
          >
            Create your profile
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
