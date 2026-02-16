import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasBumperBeenShown } from '../../lib/bumperSession';
import {
  completeStepStack,
  completeStepSubtext,
  completeStepTitle,
  signupPaper,
} from '../../theme/signupStyles';
import { useSignup } from '../../context/useSignup';

/** After Join: IF bumper already shown this session → go to Feed; ELSE → show bumper then redirect. */
const BUMPER_FROM_JOIN = '/bumper?from=join&next=/feed';

export const CompleteStep = () => {
  const navigate = useNavigate();
  const { resetSignup } = useSignup();

  const goToFeedOrBumper = useCallback(() => {
    resetSignup();
    if (hasBumperBeenShown()) {
      navigate('/feed');
    } else {
      navigate(BUMPER_FROM_JOIN);
    }
  }, [navigate, resetSignup]);

  // Auto-advance after 2.5s (or on button click) using the same IF/ELSE above
  useEffect(() => {
    const timer = window.setTimeout(goToFeedOrBumper, 2500);
    return () => window.clearTimeout(timer);
  }, [goToFeedOrBumper]);

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
        <Stack spacing={3} sx={completeStepStack}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={completeStepTitle}>
              You&apos;re in
            </Typography>
            <Typography variant="body2" sx={completeStepSubtext}>
              Your signup request has been submitted. We&apos;ll review it soon.
              In the meantime, you can explore your dashboard and the feed
              without needing to do anything else.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={goToFeedOrBumper}
            fullWidth
          >
            Go to your dashboard now
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
