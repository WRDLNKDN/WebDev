import { Box, Container, Link, Paper, Typography } from '@mui/material';

const CONTACT_EMAIL = 'info@wrdlnkdn.com';

export const Terms = () => (
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
          Terms of Service (Public Notice)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Effective Date: January 13, 2026 | Last Updated: January 13, 2026
        </Typography>

        <Typography variant="body1" paragraph>
          This Terms of Service document is provided as a public notice
          describing how the WRDLNKDN website and platform operate and the
          expectations for use.
        </Typography>
        <Typography variant="body1" paragraph>
          This notice is not a contract requiring signature. Continued use of
          the Service after the Effective Date indicates acknowledgment of this
          notice.
        </Typography>
        <Typography variant="body1" paragraph>
          This notice is hosted publicly to support transparency, accessibility,
          and version history.
        </Typography>
        <Typography variant="body1" paragraph>
          If you do not agree to follow these expectations, do not access or use
          the Service.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
          1. About the Service
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN is a community driven platform designed to support creative,
          technical, and professional collaboration. The Service may include
          user profiles, content sharing, community discussions, open source
          collaboration, and other features that may evolve over time.
        </Typography>
        <Typography variant="body2" paragraph>
          The Service is operated by Drake Svc LLC, doing business as WRDLNKDN
          (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          2. Eligibility
        </Typography>
        <Typography variant="body2" paragraph>
          Public access to view the Service is available to all users.
        </Typography>
        <Typography variant="body2" paragraph>
          Creating an account, contributing content, participating in governance
          activities, or making financial contributions requires you to be at
          least 18 years old.
        </Typography>
        <Typography variant="body2" paragraph>
          By using account level or contribution features, you represent and
          warrant that you meet this eligibility requirement.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          3. Account Registration
        </Typography>
        <Typography variant="body2" paragraph>
          Some features of the Service may require account creation.
        </Typography>
        <Typography variant="body2" paragraph>
          You are responsible for providing accurate information, maintaining
          the security of your credentials, and all activity that occurs under
          your account.
        </Typography>
        <Typography variant="body2" paragraph>
          We reserve the right to approve, deny, suspend, or terminate accounts
          at our discretion.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          4. User Content
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Ownership
        </Typography>
        <Typography variant="body2" paragraph>
          You retain ownership of any content you submit, post, or display on
          the Service (&quot;User Content&quot;).
        </Typography>
        <Typography variant="body2" paragraph>
          By submitting User Content, you grant Drake Svc LLC, DBA WRDLNKDN a
          non-exclusive, worldwide, royalty-free license to host, display,
          reproduce, and distribute your content solely for the purpose of
          operating, maintaining, and improving the Service.
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
          Responsibility
        </Typography>
        <Typography variant="body2" paragraph>
          You are solely responsible for your User Content.
        </Typography>
        <Typography variant="body2" paragraph>
          You represent and warrant that you have the necessary rights to submit
          the content and that it does not violate any applicable law or third
          party rights.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          5. Acceptable Use
        </Typography>
        <Typography variant="body2" paragraph>
          You agree not to use the Service in a manner that is unlawful,
          harmful, abusive, deceptive, or disruptive.
        </Typography>
        <Typography variant="body2" paragraph>
          Prohibited behavior includes, but is not limited to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Harassment, discrimination, or defamation</li>
          <li>Impersonation or misrepresentation</li>
          <li>Uploading malware, spam, or malicious code</li>
          <li>Attempting to exploit, scrape, or disrupt the Service</li>
          <li>Reverse engineering without authorization</li>
        </Box>
        <Typography variant="body2" paragraph>
          We reserve the right to remove content or restrict access that
          undermines the community or violates this notice.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          6. Open Source and Contributions
        </Typography>
        <Typography variant="body2" paragraph>
          Certain portions of the Service may involve open source software,
          repositories, or contributor-governed materials.
        </Typography>
        <Typography variant="body2" paragraph>
          Contributions may be subject to separate contributor agreements or
          open source licenses, which apply only when explicitly accepted.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          7. Community Governance
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN includes community-led discussion and governance mechanisms.
        </Typography>
        <Typography variant="body2" paragraph>
          Participation does not create any partnership, employment, fiduciary,
          or agency relationship. Final operational and legal responsibility
          remains with Drake Svc LLC unless explicitly stated otherwise.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          8. Paid Features and Contributions
        </Typography>
        <Typography variant="body2" paragraph>
          The Service may offer paid features or accept voluntary contributions.
        </Typography>
        <Typography variant="body2" paragraph>
          Unless otherwise stated, payments and contributions are non-refundable
          and do not confer ownership, control, or governance rights.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          9. Intellectual Property
        </Typography>
        <Typography variant="body2" paragraph>
          The Service, including site content, branding elements, logos,
          graphics, and software created by Drake Svc LLC, DBA WRDLNKDN, is
          protected by applicable intellectual property laws, including
          copyright and common law rights.
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN names, logos, and branding may not be used in a manner that
          is misleading, confusing, or implies endorsement without prior written
          permission.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          10. Third Party Links and Services
        </Typography>
        <Typography variant="body2" paragraph>
          The Service may reference or link to third party websites or services.
        </Typography>
        <Typography variant="body2" paragraph>
          We are not responsible for third party content, policies, or
          practices. Use of third party services is at your own risk.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          11. Disclaimer of Warranties
        </Typography>
        <Typography variant="body2" paragraph>
          The Service is provided &quot;as is&quot; and &quot;as
          available.&quot;
        </Typography>
        <Typography variant="body2" paragraph>
          We make no warranties regarding availability, reliability, or fitness
          for a particular purpose to the fullest extent permitted by law.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          12. Limitation of Liability
        </Typography>
        <Typography variant="body2" paragraph>
          To the maximum extent permitted by law, Drake Svc LLC, DBA WRDLNKDN
          shall not be liable for indirect, incidental, consequential, or
          punitive damages arising from use of the Service.
        </Typography>
        <Typography variant="body2" paragraph>
          Total liability shall not exceed the amount paid to Drake Svc LLC, DBA
          WRDLNKDN, if any, in the twelve months preceding the claim.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          13. Indemnification
        </Typography>
        <Typography variant="body2" paragraph>
          You agree to indemnify and hold harmless Drake Svc LLC, DBA WRDLNKDN
          from claims arising from misuse of the Service or violation of this
          notice.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          14. Termination
        </Typography>
        <Typography variant="body2" paragraph>
          We may suspend or terminate access to the Service at any time for
          conduct that violates this notice or is harmful to the community.
        </Typography>
        <Typography variant="body2" paragraph>
          Upon termination, access rights cease immediately.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          15. Changes to This Notice
        </Typography>
        <Typography variant="body2" paragraph>
          This notice may be updated periodically to reflect operational, legal,
          or community changes.
        </Typography>
        <Typography variant="body2" paragraph>
          Material updates will be reflected by updating the Last Updated date.
          Continued use of the Service after publication indicates
          acknowledgment of the revised notice.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          16. Governing Law
        </Typography>
        <Typography variant="body2" paragraph>
          This notice is governed by the laws of the State of Washington,
          without regard to conflict of law principles.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          17. Contact Information
        </Typography>
        <Typography variant="body2" paragraph>
          Questions regarding this notice may be directed to:
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
            href="https://github.com/WRDLNKDN/Agreements/wiki/Terms-of-Service-(Public-Notice)"
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

export default Terms;
