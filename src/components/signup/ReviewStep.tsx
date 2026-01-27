import { Alert, Box, Stack, Typography } from '@mui/material';
import { useSignup } from '../../context/useSignup';

export const ReviewStep = () => {
  const { state } = useSignup();

  const identity = state.identity;
  const values = state.values;
  const profile = state.profile;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        Review
      </Typography>

      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Confirm your details before submitting your registration request.
      </Typography>

      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Identity
        </Typography>
        <Typography variant="body2">
          <strong>Email:</strong> {identity?.email ?? '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Provider:</strong> {identity?.provider ?? '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Terms accepted:</strong>{' '}
          {identity?.termsAccepted ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Guidelines accepted:</strong>{' '}
          {identity?.guidelinesAccepted ? 'Yes' : 'No'}
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Values
        </Typography>
        <Typography variant="body2">
          <strong>Join reason:</strong>{' '}
          {values?.joinReason?.length ? values.joinReason.join(', ') : '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Participation style:</strong>{' '}
          {values?.participationStyle?.length
            ? values.participationStyle.join(', ')
            : '—'}
        </Typography>
        {values?.additionalContext ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Additional context:</strong> {values.additionalContext}
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Profile
        </Typography>
        <Typography variant="body2">
          <strong>Display name:</strong> {profile?.displayName ?? '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Tagline:</strong> {profile?.tagline ?? '—'}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        This is a preview. Profile submission happens in the Complete step.
      </Alert>
    </Stack>
  );
};

export default ReviewStep;
