import {
  alpha,
  Box,
  Collapse,
  Container,
  Grid,
  Link,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
    title: 'Platform',
    links: [
      { label: 'Feed', href: '/feed' },
      { label: 'Chat', href: '/chat-full' },
      { label: 'Notifications', href: '/dashboard/notifications' },
      { label: 'Directory', href: '/directory' },
    ],
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

export const Footer = () => {
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
      closeAllSections();
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
        mt: { xs: 6, md: 8 },
        pt: { xs: 4, md: 5 },
        pb: { xs: 3, md: 4 },
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
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 2.5, md: 3.5 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack
              spacing={1.1}
              sx={{
                pr: { md: 3 },
                alignItems: { xs: 'center', md: 'flex-start' },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 0.6, md: 0.9 }}
                alignItems="center"
              >
                <Box
                  component="img"
                  src="/assets/og_weirdlings/werdling1_transparent.png"
                  alt="WRDLNKDN Weirdling logo"
                  width={isDesktop ? 70 : 58}
                  height={isDesktop ? 70 : 58}
                  sx={{
                    display: 'block',
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
                  width={isDesktop ? 236 : 192}
                  sx={{
                    display: 'block',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    p: 0,
                    m: 0,
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Business, but weirder.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Build signal-first connections with humans, not vanity metrics.
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              aria-label="Footer navigation sections"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 1.25,
              }}
            >
              {sections.map((section) => {
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
                        px: { xs: 1.5, md: 2 },
                        py: { xs: 1.1, md: 1.2 },
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '-2px',
                        },
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
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
                          px: { xs: 1.5, md: 2 },
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
                        {section.links.map((link) => {
                          const active = isActiveLink(link.href, link.external);
                          const commonSx = {
                            display: 'inline-flex',
                            alignItems: 'center',
                            py: 0.75,
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
        </Grid>

        <Box
          sx={{
            mt: { xs: 3.5, md: 4 },
            pt: { xs: 2, md: 2.5 },
            borderTop: '1px solid',
            borderColor: dividerColor,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
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
