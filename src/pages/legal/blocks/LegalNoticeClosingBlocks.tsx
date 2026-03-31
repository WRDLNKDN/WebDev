import { Link, Typography } from '@mui/material';

type LegalChangesSectionProps = {
  title: string;
  /** Sentence stem before " periodically to reflect…" */
  lead: string;
};

export const LegalChangesSection = ({
  title,
  lead,
}: LegalChangesSectionProps) => (
  <>
    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
      {title}
    </Typography>
    <Typography variant="body2" paragraph>
      {lead} periodically to reflect operational, legal, or community changes.
    </Typography>
    <Typography variant="body2" paragraph>
      Material updates will be reflected by updating the Last Updated date.
      Continued use of the Service after publication indicates acknowledgment of
      the revised notice.
    </Typography>
  </>
);

type LegalGoverningLawSectionProps = { title: string };

export const LegalGoverningLawSection = ({
  title,
}: LegalGoverningLawSectionProps) => (
  <>
    <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
      {title}
    </Typography>
    <Typography variant="body2" paragraph>
      This notice is governed by the laws of the State of Washington, without
      regard to conflict of law principles.
    </Typography>
  </>
);

type LegalCanonicalWikiLinkProps = {
  href: string;
};

export const LegalCanonicalWikiLink = ({
  href,
}: LegalCanonicalWikiLinkProps) => (
  <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
    Canonical version:{' '}
    <Link href={href} target="_blank" rel="noopener noreferrer">
      GitHub wiki
    </Link>
  </Typography>
);
