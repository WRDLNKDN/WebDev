import { Box, Container, Paper, Typography } from '@mui/material';

export const Terms = () => {
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
            Terms of Service
          </Typography>

          <Typography variant="body1" paragraph>
            Last updated: January 2026
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            1. Acceptance of Terms
          </Typography>
          <Typography variant="body2" paragraph>
            By accessing and using WRDLNKDN, you accept and agree to be bound by
            these Terms of Service.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            2. Account Registration
          </Typography>
          <Typography variant="body2" paragraph>
            You must provide accurate and complete information during
            registration. All accounts require approval before activation.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            3. User Conduct
          </Typography>
          <Typography variant="body2" paragraph>
            You agree to use WRDLNKDN professionally and respectfully.
            Harassment, spam, or malicious behavior will result in account
            termination.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            4. Privacy
          </Typography>
          <Typography variant="body2" paragraph>
            We collect and use your information as described in our Privacy
            Policy. Your email and OAuth provider information are stored
            securely.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            5. Content Ownership
          </Typography>
          <Typography variant="body2" paragraph>
            You retain ownership of content you post. By posting, you grant
            WRDLNKDN a license to display and distribute your content on the
            platform.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
            6. Termination
          </Typography>
          <Typography variant="body2" paragraph>
            We reserve the right to suspend or terminate accounts that violate
            these terms.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Terms;
