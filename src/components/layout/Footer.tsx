import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Container, Grid, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const LEGAL_WIKI = {
  legal: 'https://github.com/WRDLNKDN/Agreements/wiki/Legal',
  terms:
    'https://github.com/WRDLNKDN/Agreements/wiki/Terms-of-Service-(Public-Notice)',
  privacy:
    'https://github.com/WRDLNKDN/Agreements/wiki/Privacy-Policy-(Public-Notice)',
  guidelines:
    'https://github.com/WRDLNKDN/Agreements/wiki/Community-Guidelines',
};

const FOOTER_LINK = {
  sx: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.875rem',
    '&:hover': { color: 'primary.light', textDecoration: 'underline' },
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
    },
  },
};

const Column = ({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) => {
  return (
    <Stack spacing={1.5} component="nav" aria-label={title}>
      <Typography
        component="h2"
        variant="subtitle2"
        fontWeight={700}
        color="rgba(255,255,255,0.95)"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {title}
      </Typography>
      {links.map(({ label, href, external }) =>
        external ? (
          <Link
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            variant="body2"
            {...FOOTER_LINK}
          >
            {label}
            <OpenInNewIcon
              sx={{ fontSize: 14, ml: 0.25, verticalAlign: 'middle' }}
              aria-hidden
            />
          </Link>
        ) : (
          <Link
            key={label}
            component={RouterLink}
            to={href}
            underline="hover"
            variant="body2"
            {...FOOTER_LINK}
          >
            {label}
          </Link>
        ),
      )}
    </Stack>
  );
};

export const Footer = () => {
  const year = new Date().getFullYear();

  const columns = [
    {
      title: 'About WRDLNKDN',
      links: [
        { label: 'About WRDLNKDN', href: '/about', external: false },
        { label: 'Why WRDLNKDN', href: '/about#why', external: false },
        { label: 'Values and Mission', href: '/about#values', external: false },
        { label: 'Community Guidelines', href: '/guidelines', external: false },
        { label: 'Contact', href: 'mailto:wrdlnkdn@gmail.com', external: true },
        {
          label: 'wrdlnkdn@gmail.com',
          href: 'mailto:wrdlnkdn@gmail.com',
          external: true,
        },
      ],
    },
    {
      title: 'Community and Participation',
      links: [
        { label: 'Join the Community', href: '/signup', external: false },
        {
          label: 'Contributors and Volunteers',
          href: '/community#contributors',
          external: false,
        },
        { label: 'Community Voices', href: '/directory', external: false },
        { label: 'Discord', href: '/community#discord', external: false },
      ],
    },
    {
      title: 'Open Source and Platform',
      links: [
        {
          label: 'GitHub Organization',
          href: 'https://github.com/WRDLNKDN',
          external: true,
        },
        {
          label: 'Documentation / Wiki',
          href: '/platform#docs',
          external: false,
        },
        {
          label: 'Roadmap or Project Boards',
          href: 'https://github.com/WRDLNKDN/WebDev/issues',
          external: true,
        },
      ],
    },
    {
      title: 'Legal and Governance',
      links: [
        {
          label: 'Legal (Canonical Index)',
          href: LEGAL_WIKI.legal,
          external: true,
        },
        { label: 'Terms of Service', href: LEGAL_WIKI.terms, external: true },
        { label: 'Privacy Policy', href: LEGAL_WIKI.privacy, external: true },
        {
          label: 'Community Guidelines',
          href: LEGAL_WIKI.guidelines,
          external: true,
        },
      ],
    },
  ];

  return (
    <Box
      component="footer"
      role="contentinfo"
      aria-label="Site footer"
      sx={{
        mt: 'auto',
        bgcolor: 'rgba(0,0,0,0.9)',
        color: 'rgba(255,255,255,0.9)',
        borderTop: '1px solid',
        borderColor: 'rgba(255,255,255,0.1)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid
          container
          spacing={4}
          sx={{
            pb: 3,
            borderBottom: '1px solid',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          {columns.map((col) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={col.title}>
              <Column title={col.title} links={col.links} />
            </Grid>
          ))}
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ pt: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Link
              component={RouterLink}
              to="/"
              sx={{ display: 'block', lineHeight: 0 }}
              aria-label="WRDLNKDN home"
            >
              <Box
                component="img"
                src="/assets/logo.png"
                alt="WRDLNKDN"
                sx={{ height: 36, width: 'auto', display: 'block' }}
              />
            </Link>
            <Typography variant="body2" color="rgba(255,255,255,0.8)">
              © {year} WRDLNKDN. Stay weird. Build cool stuff.
            </Typography>
          </Stack>
          <Typography variant="body2" color="rgba(255,255,255,0.8)">
            Drake Svc LLC DBA WRDLNKDN
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
