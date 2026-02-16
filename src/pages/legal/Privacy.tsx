import { Box, Container, Link, Paper, Typography } from '@mui/material';

const CONTACT_EMAIL = 'info@wrdlnkdn.com';

export const Privacy = () => (
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
          Privacy Policy (Public Notice)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Effective Date: January 13, 2026 | Last Updated: January 13, 2026
        </Typography>

        <Typography variant="body1" paragraph>
          This Privacy Policy is provided as a public notice describing how
          information is collected, used, and handled when accessing or using
          the WRDLNKDN website and platform.
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
          If you do not agree to the practices described below, do not access or
          use the Service.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
          1. About This Notice
        </Typography>
        <Typography variant="body2" paragraph>
          This Privacy Policy explains the data practices for the WRDLNKDN
          platform.
        </Typography>
        <Typography variant="body2" paragraph>
          WRDLNKDN is operated by Drake Svc LLC, doing business as WRDLNKDN
          (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </Typography>
        <Typography variant="body2" paragraph>
          Drake Svc LLC is the data controller for purposes of applicable
          privacy and data protection laws.
        </Typography>
        <Typography variant="body2" paragraph>
          This notice applies to public visitors, registered users,
          contributors, and participants interacting with the Service at
          https://wrdlnkdn.com
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          2. Information We Collect
        </Typography>
        <Typography variant="body2" paragraph>
          We aim to collect the minimum information necessary to operate the
          Service.
        </Typography>
        <Typography variant="body2" paragraph>
          Information that may be collected includes:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>
            Information you voluntarily provide, such as account details,
            profile information, or content submissions
          </li>
          <li>Communications you send to us directly</li>
          <li>
            Technical information generated through normal website operation,
            such as: IP address, browser type, device type, and basic usage data
          </li>
        </Box>
        <Typography variant="body2" paragraph>
          We do not intentionally collect sensitive personal information.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          3. How We Use Information
        </Typography>
        <Typography variant="body2" paragraph>
          Information collected may be used to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Operate, maintain, and improve the Service</li>
          <li>Manage accounts and community participation</li>
          <li>Respond to inquiries or support requests</li>
          <li>Protect the security and integrity of the platform</li>
          <li>Comply with legal obligations</li>
        </Box>
        <Typography variant="body2" paragraph>
          We do not sell personal information.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          4. Legal Bases for Processing (GDPR)
        </Typography>
        <Typography variant="body2" paragraph>
          For individuals located in the European Economic Area (EEA), United
          Kingdom, or other regions with similar data protection laws, our
          processing of personal information is based on one or more of the
          following lawful bases:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Your consent, where provided</li>
          <li>
            Performance of a contract or steps taken at your request prior to
            entering a contract
          </li>
          <li>
            Our legitimate interests in operating and improving the Service,
            where such interests do not override your rights
          </li>
          <li>Compliance with legal obligations</li>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          5. Cookies and Similar Technologies
        </Typography>
        <Typography variant="body2" paragraph>
          The Service may use basic cookies or similar technologies to support
          functionality, security, and performance.
        </Typography>
        <Typography variant="body2" paragraph>
          Cookies are not used for targeted advertising or behavioral profiling.
        </Typography>
        <Typography variant="body2" paragraph>
          You may adjust browser settings to limit or disable cookies, though
          some features may be affected.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          6. Sharing of Information
        </Typography>
        <Typography variant="body2" paragraph>
          We do not sell or rent personal information.
        </Typography>
        <Typography variant="body2" paragraph>
          Information may be shared only in limited circumstances, including:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>With service providers supporting platform operations</li>
          <li>To comply with legal obligations or lawful requests</li>
          <li>
            To protect the rights, safety, or integrity of the Service and its
            users
          </li>
        </Box>
        <Typography variant="body2" paragraph>
          Any sharing is limited to what is reasonably necessary.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          7. Public Content
        </Typography>
        <Typography variant="body2" paragraph>
          Some content you submit, such as profile information or contributions,
          may be publicly visible by design.
        </Typography>
        <Typography variant="body2" paragraph>
          You are responsible for the information you choose to make public
          through the Service.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          8. Data Retention
        </Typography>
        <Typography variant="body2" paragraph>
          Information is retained only for as long as necessary to operate the
          Service, meet legal obligations, or resolve disputes.
        </Typography>
        <Typography variant="body2" paragraph>
          Content or accounts may be removed upon request where reasonably
          feasible, subject to operational and legal constraints.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          9. Security
        </Typography>
        <Typography variant="body2" paragraph>
          We take reasonable measures to protect information from unauthorized
          access, loss, or misuse.
        </Typography>
        <Typography variant="body2" paragraph>
          However, no system can be guaranteed to be completely secure, and use
          of the Service is at your own risk.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          10. Your Privacy Rights (GDPR)
        </Typography>
        <Typography variant="body2" paragraph>
          If you are located in the EEA or United Kingdom, you have the right
          to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>Request access to your personal information</li>
          <li>Request correction of inaccurate or incomplete information</li>
          <li>Request deletion of your personal information</li>
          <li>Request restriction of processing</li>
          <li>Object to processing based on legitimate interests</li>
          <li>Request data portability, where applicable</li>
          <li>
            Withdraw consent at any time where processing is based on consent
          </li>
        </Box>
        <Typography variant="body2" paragraph>
          Requests may be submitted using the contact information below. We will
          respond in accordance with applicable law.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          11. California Privacy Rights (CCPA/CPRA)
        </Typography>
        <Typography variant="body2" paragraph>
          If you are a California resident, you have the right to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <li>
            Know what personal information is collected, used, or disclosed
          </li>
          <li>Request access to or deletion of personal information</li>
          <li>Correct inaccurate personal information</li>
          <li>
            Limit use or disclosure of sensitive personal information, if
            applicable
          </li>
          <li>
            Not be discriminated against for exercising your privacy rights
          </li>
        </Box>
        <Typography variant="body2" paragraph>
          WRDLNKDN does not sell or share personal information for cross-context
          behavioral advertising.
        </Typography>
        <Typography variant="body2" paragraph>
          Requests may be submitted using the contact information below. We may
          need to verify your identity before processing a request.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          12. Children&apos;s Privacy
        </Typography>
        <Typography variant="body2" paragraph>
          The Service is intended for a general audience.
        </Typography>
        <Typography variant="body2" paragraph>
          Public access to view the Service is available to all users.
        </Typography>
        <Typography variant="body2" paragraph>
          Creating accounts, contributing content, participating in governance
          activities, or making financial contributions requires users to be at
          least 18 years old.
        </Typography>
        <Typography variant="body2" paragraph>
          We do not knowingly collect personal information from children.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          13. Third Party Services and Links
        </Typography>
        <Typography variant="body2" paragraph>
          The Service may link to or integrate with third party services.
        </Typography>
        <Typography variant="body2" paragraph>
          We are not responsible for the privacy practices of third parties. Use
          of third party services is subject to their own privacy policies.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          14. Changes to This Notice
        </Typography>
        <Typography variant="body2" paragraph>
          This Privacy Policy may be updated periodically to reflect
          operational, legal, or community changes.
        </Typography>
        <Typography variant="body2" paragraph>
          Material updates will be reflected by updating the Last Updated date.
          Continued use of the Service after publication indicates
          acknowledgment of the revised notice.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          15. Governing Law
        </Typography>
        <Typography variant="body2" paragraph>
          This notice is governed by the laws of the State of Washington,
          without regard to conflict of law principles.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
          16. Contact Information
        </Typography>
        <Typography variant="body2" paragraph>
          Questions or requests regarding this Privacy Policy or your personal
          information may be directed to:
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
            href="https://github.com/WRDLNKDN/Agreements/wiki/Privacy-Policy-(Public-Notice)"
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

export default Privacy;
