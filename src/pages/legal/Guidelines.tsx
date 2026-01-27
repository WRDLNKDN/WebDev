import { Box, Container, Paper, Typography } from '@mui/material';

export const Guidelines = () => {
  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            Community Guidelines
          </Typography>

          <Typography variant="body1" paragraph>
            {`WRDLNKDN is "a weird place to do business" - professional networking with personality.`}
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            Be Professional, Be Human
          </Typography>
          <Typography variant="body2" paragraph>
            Bring your authentic self while maintaining professionalism. Show
            personality, share interests, but keep it appropriate for a business
            context.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            Respect Others
          </Typography>
          <Typography variant="body2" paragraph>
            Treat all members with respect. No harassment, discrimination, hate
            speech, or personal attacks.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            No Spam
          </Typography>
          <Typography variant="body2" paragraph>
            {"Don't spam, mass-message, or engage in unsolicited promotion. "}
            Quality connections over quantity.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            Keep It Legal
          </Typography>
          <Typography variant="body2" paragraph>
            No illegal content, scams, or fraudulent activity.{' '}
            {"Don't impersonate "}
            others or misrepresent yourself.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            Privacy Matters
          </Typography>
          <Typography variant="body2" paragraph>
            Respect others&apos; privacy. Don&apos;t share private information
            without consent.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            Reporting Issues
          </Typography>
          <Typography variant="body2" paragraph>
            If you see content or behavior that violates these guidelines,
            report it to our moderation team.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Guidelines;
