import { Link, Typography } from '@mui/material';
import {
  LegalCanonicalWikiLink,
  LegalChangesSection,
  LegalGoverningLawSection,
} from '../blocks/LegalNoticeClosingBlocks';

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

    <LegalChangesSection
      title="14. Changes to This Notice"
      lead="This Privacy Policy may be updated"
    />
    <LegalGoverningLawSection title="15. Governing Law" />

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

    <LegalCanonicalWikiLink href="https://github.com/WRDLNKDN/Agreements/wiki/Privacy-Policy-(Public-Notice)" />
  </>
);
