import { Box, Container, Link, Paper, Typography } from '@mui/material';

const CONTACT_EMAIL = 'info@wrdlnkdn.com';

export const Guidelines = () => (
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
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Community Guidelines
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Effective Date: January 13, 2026 | Last Updated: January 13, 2026
        </Typography>

        <Typography variant="body1" paragraph>
          These Community Guidelines are provided as a public notice outlining
          expected behavior and participation standards for the WRDLNKDN
          platform.
        </Typography>
        <Typography variant="body1" paragraph>
          These guidelines are not a contract and do not require signature. They
          exist to support a healthy, inclusive, and constructive community.
        </Typography>
        <Typography variant="body1" paragraph>
          Use of the Service indicates acknowledgment of these guidelines.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
          1. Purpose
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN exists to support creative, technical, and professional
          collaboration in an open, respectful environment.
        </Typography>
        <Typography variant="body2" paragraph>
          These guidelines describe how community members are expected to
          interact with one another and with the platform. They are intended to
          set clear expectations while allowing room for creativity, humor, and
          diverse perspectives.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          2. Scope
        </Typography>
        <Typography variant="body2" paragraph>
          These guidelines apply to all interactions on WRDLNKDN, including but
          not limited to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Public and private discussions</li>
          <li>User profiles and content</li>
          <li>Contributions to projects or repositories</li>
          <li>Governance participation</li>
          <li>Community events and communications</li>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          3. Be Respectful
        </Typography>
        <Typography variant="body2" paragraph>
          We expect participants to treat one another with respect.
        </Typography>
        <Typography variant="body2" paragraph>
          This includes:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Engaging in good-faith discussions</li>
          <li>Allowing space for differing viewpoints</li>
          <li>Avoiding personal attacks, harassment, or intimidation</li>
          <li>Refraining from discriminatory or hateful language</li>
        </Box>
        <Typography variant="body2" paragraph>
          Disagreement is fine. Disrespect is not.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          4. Be Honest and Authentic
        </Typography>
        <Typography variant="body2" paragraph>
          Represent yourself accurately.
        </Typography>
        <Typography variant="body2" paragraph>
          Do not:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Impersonate others</li>
          <li>Misrepresent affiliations or credentials</li>
          <li>Mislead the community for personal or professional gain</li>
        </Box>
        <Typography variant="body2" paragraph>
          Authenticity builds trust and keeps the community healthy.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          5. Keep It Constructive
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN is not a place for spam, manipulation, or disruption.
        </Typography>
        <Typography variant="body2" paragraph>
          Avoid:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Posting spam, scams, or unsolicited promotions</li>
          <li>Repeatedly derailing discussions</li>
          <li>Posting content solely to provoke or inflame others</li>
          <li>Uploading malicious or harmful material</li>
        </Box>
        <Typography variant="body2" paragraph>
          Constructive contribution matters more than volume.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          6. Content Responsibility
        </Typography>
        <Typography variant="body2" paragraph>
          You are responsible for the content you share.
        </Typography>
        <Typography variant="body2" paragraph>
          Before posting, consider:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>
            Whether the content is appropriate for a mixed professional audience
          </li>
          <li>Whether it respects others&apos; privacy and rights</li>
          <li>Whether it contributes positively to the community</li>
        </Box>
        <Typography variant="body2" paragraph>
          Some content may be removed even if it does not violate a specific
          rule, if it undermines the community&apos;s purpose or well-being.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          7. Open Collaboration and Credit
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN values collaboration and shared creation.
        </Typography>
        <Typography variant="body2" paragraph>
          When contributing:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Respect licenses and contributor agreements</li>
          <li>Give appropriate credit where due</li>
          <li>Do not claim ownership of others&apos; work</li>
          <li>Follow contribution guidelines when applicable</li>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          8. Enforcement
        </Typography>
        <Typography variant="body2" paragraph>
          These guidelines are enforced to protect the community, not to punish
          individuals.
        </Typography>
        <Typography variant="body2" paragraph>
          Responses to violations may include:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Content removal</li>
          <li>Warnings or guidance</li>
          <li>Temporary restrictions</li>
          <li>Account suspension or removal</li>
        </Box>
        <Typography variant="body2" paragraph>
          Severity and intent are considered when determining outcomes.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          9. Relationship to Other Policies
        </Typography>
        <Typography variant="body2" paragraph>
          These Community Guidelines complement, but do not replace:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Terms of Service (Public Notice)</li>
          <li>Privacy Policy (Public Notice)</li>
          <li>Contributor Agreement</li>
          <li>Reimbursement Policy</li>
        </Box>
        <Typography variant="body2" paragraph>
          Where conflicts arise, the applicable agreement or notice governs.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          10. Questions or Concerns
        </Typography>
        <Typography variant="body2" paragraph>
          If you have questions about these guidelines or need to report an
          issue, please contact:
        </Typography>
        <Typography variant="body2" paragraph>
          Drake Svc LLC, DBA WRDLNKDN
          <br />
          Email:{' '}
          <Link href={`mailto:${CONTACT_EMAIL}`} color="primary">
            {CONTACT_EMAIL}
          </Link>
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Canonical version:{' '}
          <Link
            href="https://github.com/WRDLNKDN/Agreements/wiki/Community-Guidelines"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub wiki
          </Link>
        </Typography>
      </Paper>
    </Container>
  </Box>
);

export default Guidelines;
