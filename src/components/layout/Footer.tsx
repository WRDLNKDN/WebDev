import {
  alpha,
  Box,
  Collapse,
  Container,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FacebookIcon from '@mui/icons-material/Facebook';
import HeadsetIcon from '@mui/icons-material/Headset';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics/trackEvent';

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const PLATFORM_LINKS: FooterLink[] = [
  { label: 'Feed', href: '/feed' },
  { label: 'Chat', href: '/chat-full' },
  { label: 'Notifications', href: '/dashboard/notifications' },
  { label: 'Directory', href: '/directory' },
];

const sections: FooterSection[] = [
  {
    title: 'Platform',
    links: PLATFORM_LINKS,
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Advertise', href: '/advertise' },
      { label: 'Community Partners', href: '/community-partners' },
      {
        label: 'Contact',
        href: 'https://github.com/WRDLNKDN/Agreements?tab=readme-ov-file#contact',
        external: true,
      },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Community Guidelines', href: '/guidelines' },
    ],
  },
];

type FooterProps = {
  /** When false, Chat link is hidden (e.g. when not logged in). */
  showChatLink?: boolean;
};

export const Footer = ({ showChatLink = false }: FooterProps) => {
  const theme = useTheme();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Platform: false,
    Company: false,
    Legal: false,
  });
  const [visible, setVisible] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);

  const dividerColor = useMemo(
    () =>
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.14)
        : alpha(theme.palette.text.primary, 0.14),
    [
      theme.palette.mode,
      theme.palette.common.white,
      theme.palette.text.primary,
    ],
  );

  const footerStructuredData = useMemo(() => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://wrdlnkdn.com';
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'WRDLNKDN',
      url: origin,
      logo: `${origin}/assets/github-ready/wrdlnkdn-logo-combo-horizontal.svg`,
      hasPart: sections.map((section) => ({
        '@type': 'SiteNavigationElement',
        name: section.title,
        url: section.links.map((link) =>
          link.external ? link.href : `${origin}${link.href}`,
        ),
      })),
    };
  }, []);

  useEffect(() => {
    const node = footerRef.current;
    if (!node) return;
    if (reduceMotion) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        threshold: 0.16,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const toggleSection = (title: string) => {
    setExpanded((prev) => {
      const shouldOpen = !prev[title];
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) next[key] = false;
      next[title] = shouldOpen;
      return next;
    });
  };

  const closeAllSections = () => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = false;
      return next;
    });
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Defer so keydown handler returns immediately (avoids long-task violation)
      queueMicrotask(() => closeAllSections());
    };
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const node = footerRef.current;
      if (!node) return;
      const target = event.target;
      if (target instanceof Node && !node.contains(target)) {
        closeAllSections();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const isActiveLink = (href: string, external?: boolean) => {
    if (external) return false;
    if (href === '/') return location.pathname === '/';
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  };

  const handleFooterLinkClick = (link: FooterLink) => {
    if (!link.external && link.href === '/community-partners') {
      trackEvent('footer_community_partners_click', {
        source: 'footer',
        target: link.href,
      });
    }
    closeAllSections();
  };

  return (
    <Box
      ref={footerRef}
      component="footer"
      aria-label="Site footer"
      sx={{
        borderTop: '1px solid',
        borderColor: dividerColor,
        mt: { xs: 3, md: 8 },
        pt: { xs: 2, md: 5 },
        pb: { xs: 2, md: 4 },
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.default, 0.92)
            : theme.palette.background.default,
        backdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: reduceMotion
          ? 'none'
          : 'opacity 360ms ease, transform 360ms ease',
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Grid container spacing={{ xs: 1.5, md: 3.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack
              spacing={{ xs: 0.5, md: 1.1 }}
              sx={{
                pr: { md: 3 },
                alignItems: { xs: 'center', md: 'flex-start' },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 0.4, md: 0.9 }}
                alignItems="center"
              >
                <EmojiEventsIcon
                  sx={{
                    fontSize: isDesktop ? 36 : { xs: 24, sm: 32 },
                    color: 'primary.main',
                    opacity: 0.95,
                  }}
                  aria-hidden
                />
                <Box
                  component="img"
                  src="/assets/og_weirdlings/werdling1_transparent.png"
                  alt="WRDLNKDN Weirdling logo"
                  sx={{
                    display: 'block',
                    width: isDesktop ? 70 : { xs: 36, sm: 58 },
                    height: isDesktop ? 70 : { xs: 36, sm: 58 },
                    objectFit: 'contain',
                    objectPosition: 'center',
                    p: 0,
                    m: 0,
                  }}
                />
                <Box
                  component="img"
                  src="/assets/wrdlnkdn_logo.png"
                  alt="WRDLNKDN wordmark"
                  sx={{
                    display: 'block',
                    width: isDesktop ? 236 : { xs: 100, sm: 192 },
                    maxWidth: '100%',
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    p: 0,
                    m: 0,
                  }}
                />
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                Business, but weirder.
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: 'none', md: 'block' } }}
              >
                Build signal-first connections with humans, not vanity metrics.
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              aria-label="Footer navigation sections"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                gap: { xs: 0.75, md: 1.25 },
              }}
            >
              {sections.map((section) => {
                const links =
                  section.title === 'Platform' && !showChatLink
                    ? section.links.filter((l) => l.label !== 'Chat')
                    : section.links;
                const open = Boolean(expanded[section.title]);
                const panelId = `footer-panel-${section.title.toLowerCase()}`;
                return (
                  <Box
                    key={section.title}
                    sx={{
                      border: '1px solid',
                      borderColor: dividerColor,
                      borderRadius: 1.5,
                      overflow: { xs: 'hidden', md: 'visible' },
                      position: 'relative',
                      backgroundColor: alpha(
                        theme.palette.background.paper,
                        0.2,
                      ),
                    }}
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      sx={{
                        all: 'unset',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        px: { xs: 1.25, md: 2 },
                        py: { xs: 0.9, md: 1.2 },
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '-2px',
                        },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ fontSize: { xs: '0.8125rem', md: 'inherit' } }}
                      >
                        {section.title}
                      </Typography>
                      <Box
                        component="span"
                        aria-hidden
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          transition: reduceMotion
                            ? 'none'
                            : 'transform 180ms ease',
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <ExpandMoreIcon fontSize="small" />
                      </Box>
                    </Box>

                    <Collapse in={open} timeout={reduceMotion ? 0 : 180}>
                      <Stack
                        id={panelId}
                        component="ul"
                        sx={{
                          listStyle: 'none',
                          m: 0,
                          py: 0.25,
                          px: { xs: 1.25, md: 2 },
                          borderTop: '1px solid',
                          borderColor: dividerColor,
                          gap: 0.25,
                          position: { xs: 'static', md: 'absolute' },
                          top: { md: 'calc(100% + 8px)' },
                          left: { md: 0 },
                          right: { md: 0 },
                          zIndex: { md: 4 },
                          border: { md: '1px solid' },
                          borderRadius: { md: 1.5 },
                          boxShadow: {
                            md: '0 10px 28px rgba(0,0,0,0.28)',
                          },
                          backgroundColor: {
                            md:
                              theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.96)
                                : alpha(theme.palette.background.paper, 0.98),
                          },
                        }}
                      >
                        {links.map((link) => {
                          const active = isActiveLink(link.href, link.external);
                          const commonSx = {
                            display: 'inline-flex',
                            alignItems: 'center',
                            py: { xs: 0.5, md: 0.75 },
                            color: active ? 'primary.main' : 'text.secondary',
                            fontWeight: active ? 700 : 500,
                            textDecoration: active ? 'underline' : 'none',
                            textUnderlineOffset: '3px',
                            transition: reduceMotion
                              ? 'none'
                              : 'color 160ms ease, text-decoration-color 160ms ease',
                            '&:hover': {
                              color: 'text.primary',
                              textDecoration: 'underline',
                              textUnderlineOffset: '3px',
                            },
                          } as const;
                          return (
                            <Box component="li" key={link.label}>
                              {link.external ? (
                                <Link
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleFooterLinkClick(link)}
                                  sx={commonSx}
                                >
                                  {link.label}
                                </Link>
                              ) : (
                                <Link
                                  component={RouterLink}
                                  to={link.href}
                                  onClick={() => handleFooterLinkClick(link)}
                                  sx={commonSx}
                                >
                                  {link.label}
                                </Link>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          </Grid>

          <Grid
            size={{ xs: 12, md: 3 }}
            sx={{
              display: 'flex',
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: { xs: 'center', md: 'flex-end' },
              pt: { xs: 0.5, md: 0 },
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              aria-label="Social and support links"
            >
              <IconButton
                component={Link}
                href="https://twitter.com/wrdlnkdn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <TwitterIcon fontSize="small" />
              </IconButton>
              <IconButton
                component={Link}
                href="https://www.facebook.com/wrdlnkdn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton
                component={Link}
                href="https://www.linkedin.com/company/wrdlnkdn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <LinkedInIcon fontSize="small" />
              </IconButton>
              <IconButton
                component={Link}
                href="/support"
                aria-label="Support"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <HeadsetIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: { xs: 2, md: 4 },
            pt: { xs: 1.5, md: 2.5 },
            borderTop: '1px solid',
            borderColor: dividerColor,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.7rem', md: 'inherit' } }}
          >
            © {new Date().getFullYear()} WRDLNKDN. All rights reserved.
          </Typography>
        </Box>
      </Container>

      <script
        type="application/ld+json"
        // JSON-LD is the canonical structured-data format for organization/nav SEO.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(footerStructuredData),
        }}
      />
    </Box>
  );
};
