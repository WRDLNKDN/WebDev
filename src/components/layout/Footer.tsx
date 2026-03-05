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
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
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

const sections: FooterSection[] = [
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
    title: 'Documentation',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Community Guidelines', href: '/guidelines' },
    ],
  },
];

export const Footer = () => {
  const theme = useTheme();
  const location = useLocation();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
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
    setExpandedSection((prev) => (prev === title ? null : title));
  };

  const closeAllSections = () => {
    setExpandedSection(null);
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
        mt: { xs: 1, sm: 2, md: 4 },
        pt: { xs: 1, sm: 1.5, md: 2.5 },
        pb: {
          xs: 'calc(0.85rem + env(safe-area-inset-bottom, 0px))',
          sm: 1.5,
          md: 2,
        },
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
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2 } }}>
        <Grid container spacing={{ xs: 1.1, sm: 1.5, md: 2.1 }}>
          <Grid size={{ xs: 7, md: 3 }} sx={{ order: { xs: 1, md: 1 } }}>
            <Stack
              spacing={0.45}
              sx={{
                alignItems: { xs: 'flex-start', md: 'flex-start' },
                textAlign: 'left',
                pr: { md: 1.5 },
              }}
            >
              <Stack direction="row" spacing={0.45} alignItems="center">
                <EmojiEventsIcon
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    fontSize: { xs: 22, sm: 24, md: 27 },
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
                    display: { xs: 'none', sm: 'block' },
                    width: { xs: 30, sm: 34, md: 38 },
                    height: { xs: 30, sm: 34, md: 38 },
                    objectFit: 'contain',
                    objectPosition: 'center',
                  }}
                />
                <Box
                  component="img"
                  src="/assets/wrdlnkdn_logo.png"
                  alt="WRDLNKDN wordmark"
                  sx={{
                    display: 'block',
                    width: { xs: 114, sm: 148, md: 172 },
                    maxWidth: '100%',
                    objectFit: 'contain',
                    objectPosition: 'left center',
                  }}
                />
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  fontSize: { sm: '0.76rem', md: '0.82rem' },
                }}
              >
                Business, but weirder.
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ order: { xs: 3, md: 2 } }}>
            <Box
              aria-label="Footer navigation sections"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: { xs: 0.5, sm: 0.85, md: 1 },
              }}
            >
              {sections.map((section) => {
                const open = expandedSection === section.title;
                const panelId = `footer-panel-${section.title.toLowerCase()}`;
                return (
                  <Box
                    key={section.title}
                    sx={{
                      border: '1px solid',
                      borderColor: dividerColor,
                      borderRadius: 1.25,
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
                        px: { xs: 0.9, sm: 1.25, md: 1.5 },
                        py: { xs: 0.62, sm: 0.8, md: 0.88 },
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
                        sx={{ fontSize: { xs: '0.74rem', md: '0.82rem' } }}
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
                          width: 22,
                          height: 22,
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
                          py: 0.2,
                          px: { xs: 0.9, sm: 1.25, md: 1.5 },
                          borderTop: '1px solid',
                          borderColor: dividerColor,
                          gap: 0.15,
                          position: { xs: 'static', md: 'absolute' },
                          top: { md: 'calc(100% + 6px)' },
                          left: { md: 0 },
                          right: { md: 0 },
                          zIndex: { md: 4 },
                          border: { md: '1px solid' },
                          borderRadius: { md: 1.25 },
                          boxShadow: { md: '0 10px 26px rgba(0,0,0,0.28)' },
                          backgroundColor: {
                            md:
                              theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.96)
                                : alpha(theme.palette.background.paper, 0.98),
                          },
                        }}
                      >
                        {section.links.map((link) => {
                          const active = isActiveLink(link.href, link.external);
                          const commonSx = {
                            display: 'inline-flex',
                            alignItems: 'center',
                            py: { xs: 0.45, md: 0.65 },
                            fontSize: { xs: '0.74rem', md: '0.83rem' },
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

              <Box
                sx={{
                  gridColumn: { xs: '1 / 2', sm: '1 / 2' },
                  justifySelf: 'start',
                }}
              >
                <Link
                  href="https://pay.wrdlnkdn.com/d6e9f6fd-1d56-4a47-8e35-f4f"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Donate to WRDLNKDN"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 700,
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontSize: { xs: '0.78rem', md: '0.88rem' },
                    mt: { xs: 0.05, sm: 0.28 },
                    '&:hover': {
                      textDecoration: 'underline',
                      color: 'primary.dark',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                      borderRadius: 0.5,
                    },
                  }}
                >
                  Donate Now
                </Link>
              </Box>
            </Box>
          </Grid>

          <Grid
            size={{ xs: 5, md: 3 }}
            sx={{
              order: { xs: 2, md: 3 },
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'flex-start' },
              justifyContent: { xs: 'flex-end', md: 'flex-end' },
            }}
          >
            <Stack
              spacing={0.35}
              alignItems={{ xs: 'flex-end', md: 'flex-end' }}
              sx={{ pt: { xs: 0, md: 0.15 } }}
            >
              <Stack
                direction="row"
                spacing={0.35}
                aria-label="Social and support links"
              >
                <IconButton
                  component={Link}
                  href="https://www.facebook.com/wrdlnkdn"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    p: { xs: 0.4, md: 0.55 },
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <FacebookIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
                </IconButton>
                <IconButton
                  component={Link}
                  href="https://www.linkedin.com/company/wrdlnkdn"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    p: { xs: 0.4, md: 0.55 },
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <LinkedInIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
                </IconButton>
                <IconButton
                  component={Link}
                  href="https://www.youtube.com/@WRDLNKDN"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    p: { xs: 0.4, md: 0.55 },
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <YouTubeIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
                </IconButton>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.62rem', md: '0.72rem' } }}
              >
                © {new Date().getFullYear()} WRDLNKDN. All rights reserved.
              </Typography>
            </Stack>
          </Grid>
        </Grid>
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
