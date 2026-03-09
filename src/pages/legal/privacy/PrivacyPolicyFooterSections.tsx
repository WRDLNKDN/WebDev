import { Link, Typography } from '@mui/material';

type PrivacyPolicyFooterSectionsProps = {
  contactEmail: string;
};

export const PrivacyPolicyFooterSections = ({
  contactEmail,
}: PrivacyPolicyFooterSectionsProps) => (
  <>
    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
      13. Third Party Services and Links
    </Typography>
    <Typography variant="body2" paragraph>
      The Service may link to or integrate with third party services.
    </Typography>
    <Typography variant="body2" paragraph>
      We are not responsible for the privacy practices of third parties. Use of
      third party services is subject to their own privacy policies.
    </Typography>

    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
      14. Changes to This Notice
    </Typography>
    <Typography variant="body2" paragraph>
      This Privacy Policy may be updated periodically to reflect operational,
      legal, or community changes.
    </Typography>
    <Typography variant="body2" paragraph>
      Material updates will be reflected by updating the Last Updated date.
      Continued use of the Service after publication indicates acknowledgment of
      the revised notice.
    </Typography>

    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
      15. Governing Law
    </Typography>
    <Typography variant="body2" paragraph>
      This notice is governed by the laws of the State of Washington, without
      regard to conflict of law principles.
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
      <Link href={`mailto:${contactEmail}`} color="primary">
        {contactEmail}
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
  </>
);
