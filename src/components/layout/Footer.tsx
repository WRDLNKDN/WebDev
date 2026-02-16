import BookmarkIcon from '@mui/icons-material/Bookmark';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import EventIcon from '@mui/icons-material/Event';
import FacebookIcon from '@mui/icons-material/Facebook';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ForumIcon from '@mui/icons-material/Forum';
import GitHubIcon from '@mui/icons-material/GitHub';
import GroupsIcon from '@mui/icons-material/Groups';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import HelpIcon from '@mui/icons-material/Help';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SecurityIcon from '@mui/icons-material/Security';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import YouTubeIcon from '@mui/icons-material/YouTube';
import {
  Box,
  Container,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

const CONTACT_EMAIL = 'info@wrdlnkdn.com';

const LEGAL_WIKI = {
  legal: 'https://github.com/WRDLNKDN/Agreements/wiki/Legal',
  terms:
    'https://github.com/WRDLNKDN/Agreements/wiki/Terms-of-Service-(Public-Notice)',
  privacy:
    'https://github.com/WRDLNKDN/Agreements/wiki/Privacy-Policy-(Public-Notice)',
  guidelines:
    'https://github.com/WRDLNKDN/Agreements/wiki/Community-Guidelines',
};

const SOCIALS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/wrdlnkdn',
    Icon: LinkedInIcon,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@WRDLNKDN',
    Icon: YouTubeIcon,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/wrdlnkdn/',
    Icon: InstagramIcon,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/wrdlnkdn',
    Icon: FacebookIcon,
  },
  {
    label: 'Discord',
    href: 'https://discord.gg/wrdlnkdn',
    Icon: ForumIcon,
  },
  { label: 'GitHub', href: 'https://github.com/WRDLNKDN', Icon: GitHubIcon },
];

const FOOTER_LINK_SX = {
  color: 'rgba(255,255,255,0.85)',
  fontSize: '0.875rem',
  '&:hover': { color: 'primary.light', textDecoration: 'underline' },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
} as const;

type IconComponent = React.ComponentType<{ sx?: object }>;

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
  Icon?: IconComponent;
};

const Column = ({ title, links }: { title: string; links: FooterLink[] }) => (
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
    {links.map(({ label, href, external, Icon }) => {
      const isMailto = href.startsWith('mailto:');
      const iconSx = {
        fontSize: 18,
        mr: 1,
        verticalAlign: 'middle',
        opacity: 0.9,
      };
      const content = (
        <>
          {Icon && <Icon sx={iconSx} aria-hidden />}
          {label}
          {external && !isMailto && (
            <OpenInNewIcon
              sx={{ fontSize: 14, ml: 0.25, verticalAlign: 'middle' }}
              aria-hidden
            />
          )}
        </>
      );
      return external ? (
        <Link
          key={label}
          href={href}
          {...(!isMailto && {
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
          underline="hover"
          variant="body2"
          sx={{
            ...FOOTER_LINK_SX,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {content}
        </Link>
      ) : (
        <Link
          key={label}
          component={RouterLink}
          to={href}
          underline="hover"
          variant="body2"
          sx={{
            ...FOOTER_LINK_SX,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {content}
        </Link>
      );
    })}
  </Stack>
);

/** Store link from env or fallback. */
const storeUrl =
  (import.meta.env.VITE_STORE_URL as string | undefined) ||
  'https://wrdlnkdn.com/store-1';

export const Footer = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };
    void init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void init());
    return () => subscription.unsubscribe();
  }, []);

  const signedIn = !!session?.user;

  const legalLinks: FooterLink[] = [
    {
      label: 'Terms of Service',
      href: LEGAL_WIKI.terms,
      external: true,
      Icon: DescriptionIcon,
    },
    {
      label: 'Privacy Policy',
      href: LEGAL_WIKI.privacy,
      external: true,
      Icon: SecurityIcon,
    },
    {
      label: 'Community Guidelines',
      href: LEGAL_WIKI.guidelines,
      external: true,
      Icon: FormatListBulletedIcon,
    },
    {
      label: 'Legal (Canonical Index)',
      href: LEGAL_WIKI.legal,
      external: true,
      Icon: MenuBookIcon,
    },
  ];

  const communityLinks: FooterLink[] = [
    ...(signedIn
      ? []
      : [
          {
            label: 'Join',
            href: '/join',
            external: false,
            Icon: PersonAddIcon,
          },
        ]),
    { label: 'Feed', href: '/feed', external: false, Icon: ChatIcon },
    ...(signedIn
      ? [
          {
            label: 'Dashboard',
            href: '/dashboard',
            external: false,
            Icon: DashboardIcon,
          },
        ]
      : []),
    {
      label: 'Store',
      href: storeUrl,
      external: true,
      Icon: ShoppingBagIcon,
    },
  ].filter(Boolean) as FooterLink[];

  const exploreLinks: FooterLink[] = signedIn
    ? [
        { label: 'Events', href: '/events', external: false, Icon: EventIcon },
        { label: 'Groups', href: '/forums', external: false, Icon: GroupsIcon },
        { label: 'Saved', href: '/saved', external: false, Icon: BookmarkIcon },
        {
          label: 'Advertise',
          href: '/advertise',
          external: false,
          Icon: CampaignIcon,
        },
        {
          label: 'Games',
          href: 'https://phuzzle.vercel.app/',
          external: true,
          Icon: SportsEsportsIcon,
        },
        { label: 'Help', href: '/help', external: false, Icon: HelpIcon },
      ]
    : [];

  const partnersLinks: FooterLink[] = [
    {
      label: 'Community Partners',
      href: '/community-partners',
      external: false,
      Icon: GroupWorkIcon,
    },
  ];

  const contactLinks: FooterLink[] = [
    {
      label: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      external: true,
      Icon: EmailIcon,
    },
  ];

  const columns = [
    { title: 'Legal', links: legalLinks },
    { title: 'Community', links: communityLinks },
    ...(exploreLinks.length > 0
      ? [{ title: 'Explore', links: exploreLinks }]
      : []),
    { title: 'Community Partners', links: partnersLinks },
    { title: 'Contact', links: contactLinks },
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={col.title}>
              <Column title={col.title} links={col.links} />
            </Grid>
          ))}

          {/* Socials: icon row */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Stack spacing={1.5} component="nav" aria-label="Social links">
              <Typography
                component="h2"
                variant="subtitle2"
                fontWeight={700}
                color="rgba(255,255,255,0.95)"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Social
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <IconButton
                    key={label}
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    size="small"
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      '&:hover': { color: 'primary.light' },
                    }}
                  >
                    <Icon sx={{ fontSize: 22 }} />
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          </Grid>
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
                src="/assets/og_weirdlings/weirdling_1.png"
                alt="WRDLNKDN"
                sx={{
                  height: 56,
                  minHeight: 40,
                  width: 'auto',
                  maxWidth: 80,
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </Link>
            <Typography variant="body2" color="rgba(255,255,255,0.8)">
              © 2026 WRDLNKDN. Drake Svc LLC DBA WRDLNKDN.
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
