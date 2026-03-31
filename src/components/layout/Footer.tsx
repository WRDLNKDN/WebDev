import {
  alpha,
  Box,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FacebookIcon from '@mui/icons-material/Facebook';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RouterLinkPrefetch } from '../routing/RouterLinkPrefetch';
import { trackEvent } from '../../lib/analytics/trackEvent';
import { buildPayQrCodeImageUrl } from '../../lib/marketing/payLink';
import {
  FOOTER_DONATE_URL,
  FOOTER_SECTIONS,
  FOOTER_SOCIAL_LINKS,
  type FooterLink,
} from './footerConfig';

type FooterProps = {
  /** When false, Chat link is hidden (e.g. when not logged in). */
  showChatLink?: boolean;
};

export const Footer = ({ showChatLink = false }: FooterProps) => {
  const theme = useTheme();
  const location = useLocation();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [donateDialogOpen, setDonateDialogOpen] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const footerSurface = alpha('#08111f', 0.94);
  const footerPanelSurface = alpha('#101827', 0.94);
  const footerRaisedSurface = alpha('#0d1524', 0.98);
  const footerTextPrimary = alpha(theme.palette.common.white, 0.92);
  const footerTextSecondary = alpha(theme.palette.common.white, 0.68);

  const dividerColor = useMemo(
    () => alpha(theme.palette.common.white, 0.14),
    [theme.palette.common.white],
  );

  const sections = useMemo(
    () =>
      FOOTER_SECTIONS.map((section) => ({
        ...section,
        links: section.links.filter(
          (link) => showChatLink || link.href !== '/chat',
        ),
      })),
    [showChatLink],
  );
  const companySection =
    sections.find((section) => section.title === 'Company') ?? sections[0];
  const legalSection =
    sections.find((section) => section.title === 'Legal Notices') ?? null;
  const socialLinks = useMemo(() => {
    const githubLink = FOOTER_SOCIAL_LINKS.find(
      (link) => link.label === 'GitHub',
    );
    const otherLinks = FOOTER_SOCIAL_LINKS.filter(
      (link) => link.label !== 'GitHub',
    );
    return githubLink ? [...otherLinks, githubLink] : FOOTER_SOCIAL_LINKS;
  }, []);
  const sectionTestId = (title: string) =>
    `footer-section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  const donateAbsoluteUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://wrdlnkdn.com';
    return `${origin}${FOOTER_DONATE_URL}`;
  }, []);

  const donateQrSrc = useMemo(
    () => buildPayQrCodeImageUrl(donateAbsoluteUrl),
    [donateAbsoluteUrl],
  );

  const donateLinkLabel = useMemo(() => {
    try {
      const host = new URL(donateAbsoluteUrl).hostname;
      return `Pay online at ${host}/pay`;
    } catch {
      return 'Pay online';
    }
  }, [donateAbsoluteUrl]);

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
      hasPart: FOOTER_SECTIONS.map((section) => ({
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
    // Use passive listeners for better scroll performance on mobile
    document.addEventListener('mousedown', handlePointerDown, {
      passive: true,
    });
    document.addEventListener('touchstart', handlePointerDown, {
      passive: true,
    });
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

  const renderSocialIcon = (label: string) => {
    switch (label) {
      case 'Instagram':
        return <InstagramIcon sx={{ fontSize: { xs: 15, md: 17 } }} />;
      case 'GitHub':
        return <GitHubIcon sx={{ fontSize: { xs: 15, md: 17 } }} />;
      case 'Facebook':
        return <FacebookIcon sx={{ fontSize: { xs: 15, md: 17 } }} />;
      case 'LinkedIn':
        return <LinkedInIcon sx={{ fontSize: { xs: 15, md: 17 } }} />;
      case 'YouTube':
        return <YouTubeIcon sx={{ fontSize: { xs: 15, md: 17 } }} />;
      default:
        return null;
    }
  };

  const renderFooterSection = (
    section: (typeof sections)[number],
    options?: { align?: 'left' | 'center'; panelDirection?: 'up' | 'down' },
  ) => {
    const open = expandedSection === section.title;
    const panelId = `footer-panel-${section.title.toLowerCase().replace(/\s+/g, '-')}`;
    const align = options?.align ?? 'left';
    const panelDirection = options?.panelDirection ?? 'up';

    return (
      <Box
        key={section.title}
        data-testid={sectionTestId(section.title)}
        sx={{
          border: '1px solid',
          borderColor: dividerColor,
          borderRadius: 1.5,
          position: 'relative',
          overflow: 'visible',
          backgroundColor: footerPanelSurface,
          width: 'fit-content',
          minWidth: { xs: '100%', sm: 160 },
          maxWidth: '100%',
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
            minWidth: 0,
            gap: 0.75,
            px: { xs: 1.35, md: 1.55 },
            py: { xs: 0.95, md: 1.05 },
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
            sx={{
              flex: '1 1 auto',
              minWidth: 0,
              whiteSpace: 'nowrap',
              color: footerTextPrimary,
              textAlign: align,
            }}
          >
            {section.title}
          </Typography>
          <Box
            component="span"
            aria-hidden
            sx={{
              display: 'inline-flex',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              transition: reduceMotion ? 'none' : 'transform 180ms ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ExpandMoreIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>

        {open ? (
          <Stack
            id={panelId}
            component="ul"
            sx={{
              listStyle: 'none',
              m: 0,
              py: 0.25,
              px: { xs: 1.35, md: 1.55 },
              gap: 0.25,
              position: { xs: 'fixed', sm: 'absolute' },
              left: {
                xs: 12,
                sm: align === 'center' ? '50%' : 0,
              },
              right: { xs: 12, sm: 'auto' },
              top: {
                xs: 'auto',
                sm: panelDirection === 'down' ? 'calc(100% + 8px)' : 'auto',
              },
              bottom: {
                xs: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
                sm: panelDirection === 'up' ? 'calc(100% + 8px)' : 'auto',
              },
              transform: {
                xs: 'none',
                sm: align === 'center' ? 'translateX(-50%)' : 'none',
              },
              zIndex: 6,
              border: '1px solid',
              borderColor: dividerColor,
              borderRadius: 1.5,
              boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
              maxHeight: { xs: 'min(50vh, 360px)', sm: 'min(42vh, 320px)' },
              minWidth: { xs: 'auto', sm: 220 },
              width: {
                xs: 'auto',
                sm:
                  align === 'center'
                    ? 'max-content'
                    : 'min(280px, calc(100vw - 48px))',
              },
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              backgroundColor: footerRaisedSurface,
              animation: reduceMotion ? 'none' : 'footerMenuIn 160ms ease-out',
            }}
          >
            {section.links.map((link) => {
              const active = isActiveLink(link.href, link.external);
              const commonSx = {
                display: 'inline-flex',
                alignItems: 'center',
                py: 0.75,
                color: active ? 'primary.main' : footerTextSecondary,
                fontWeight: active ? 700 : 500,
                textDecoration: active ? 'underline' : 'none',
                textUnderlineOffset: '3px',
                transition: reduceMotion
                  ? 'none'
                  : 'color 160ms ease, text-decoration-color 160ms ease',
                '&:hover': {
                  color: footerTextPrimary,
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
                      component={RouterLinkPrefetch}
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
        ) : null}
      </Box>
    );
  };

  return (
    <>
      <Box
        ref={footerRef}
        component="footer"
        aria-label="Site footer"
        data-testid="site-footer"
        sx={{
          borderTop: '1px solid',
          borderColor: dividerColor,
          mt: { xs: 0.5, sm: 1, md: 2 },
          pt: { xs: 0.5, sm: 0.75, md: 0.8 },
          pb: {
            xs: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
            sm: 0.8,
            md: 0.85,
          },
          backgroundColor: footerSurface,
          color: footerTextPrimary,
          backdropFilter: 'blur(8px)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: reduceMotion
            ? 'none'
            : 'opacity 360ms ease, transform 360ms ease',
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              },
              alignItems: 'center',
              gap: { xs: 0.9, sm: 1, md: 1.25 },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: { md: 'flex-start' } }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(160px, max-content))',
                  },
                  gap: { xs: 0.75, sm: 1.1 },
                  width: '100%',
                  justifyContent: 'flex-start',
                  justifyItems: { xs: 'stretch', sm: 'start' },
                }}
              >
                {companySection
                  ? renderFooterSection(companySection, {
                      align: 'center',
                      panelDirection: 'up',
                    })
                  : null}
                {legalSection
                  ? renderFooterSection(legalSection, {
                      align: 'center',
                      panelDirection: 'up',
                    })
                  : null}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Stack
                spacing={0.85}
                sx={{
                  alignItems: 'center',
                  textAlign: 'center',
                  px: { md: 0.75 },
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.35}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Box
                    component="img"
                    src="/assets/wrdlnkdn_logo.png"
                    alt="WRDLNKDN wordmark"
                    width={120}
                    height={30}
                    sx={{
                      display: 'block',
                      width: { xs: 114, sm: 138, md: 156 },
                      maxWidth: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                    }}
                  />
                </Stack>

                <Typography
                  variant="body2"
                  color={footerTextSecondary}
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    fontSize: { sm: '0.78rem', md: '0.84rem' },
                    lineHeight: 1.35,
                  }}
                >
                  Business, but weirder.
                </Typography>
              </Stack>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'flex-start' },
                justifyContent: {
                  xs: 'flex-start',
                  sm: 'flex-end',
                  md: 'flex-end',
                },
              }}
            >
              <Stack
                spacing={1}
                alignItems={{
                  xs: 'flex-start',
                  sm: 'flex-end',
                  md: 'flex-end',
                }}
                sx={{ width: '100%', pt: { xs: 0.15, md: 0.05 } }}
              >
                <Box
                  component="button"
                  type="button"
                  data-testid="footer-donate-link"
                  aria-label="Donate to WRDLNKDN"
                  onClick={() => {
                    trackEvent('footer_donate_link_click', {
                      source: 'footer',
                      target: FOOTER_DONATE_URL,
                    });
                    setDonateDialogOpen(true);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'fit-content',
                    maxWidth: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    fontWeight: 800,
                    letterSpacing: 0.35,
                    color: 'white',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.74rem', md: '0.8rem' },
                    lineHeight: 1,
                    minHeight: 34,
                    whiteSpace: 'nowrap',
                    px: 0.95,
                    py: 0.45,
                    borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.22)',
                    background:
                      'linear-gradient(135deg, #0d5f59 0%, #118f87 42%, #1ecfb9 100%)',
                    boxSizing: 'border-box',
                    alignSelf: { xs: 'flex-start', sm: 'flex-end' },
                    cursor: 'pointer',
                    boxShadow:
                      '0 8px 18px rgba(20,184,166,0.24), inset 0 1px 0 rgba(156,187,217,0.32)',
                    transition: reduceMotion
                      ? 'none'
                      : 'box-shadow 140ms ease, background 140ms ease, border-color 140ms ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(156,187,217,0.32), rgba(255,255,255,0))',
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      textDecoration: 'none',
                      background:
                        'linear-gradient(135deg, #0b5550 0%, #0f7a74 42%, #17b9a5 100%)',
                      borderColor: 'rgba(255,255,255,0.38)',
                      boxShadow:
                        '0 10px 22px rgba(20,184,166,0.3), inset 0 1px 0 rgba(141,188,229,0.38)',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: alpha(theme.palette.common.white, 0.9),
                      outlineOffset: 2,
                      borderRadius: 1,
                    },
                  }}
                >
                  Donate Now
                </Box>
                <Dialog
                  open={donateDialogOpen}
                  onClose={() => setDonateDialogOpen(false)}
                  aria-labelledby="donate-dialog-title"
                  aria-describedby="donate-dialog-description"
                  maxWidth="xs"
                  fullWidth
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: 2,
                        bgcolor: footerRaisedSurface,
                        color: footerTextPrimary,
                        border: '1px solid',
                        borderColor: dividerColor,
                      },
                    },
                  }}
                >
                  <DialogTitle
                    id="donate-dialog-title"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pr: 1,
                    }}
                  >
                    Donate to WRDLNKDN
                    <Tooltip title="Close">
                      <span>
                        <IconButton
                          aria-label="Close"
                          onClick={() => setDonateDialogOpen(false)}
                          sx={{ color: 'rgba(255,255,255,0.75)' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </DialogTitle>
                  <DialogContent id="donate-dialog-description">
                    <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
                      <Box
                        component="img"
                        src={donateQrSrc}
                        alt="Donate QR code"
                        width={200}
                        height={200}
                        sx={{
                          width: 200,
                          height: 200,
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                      <Link
                        href={FOOTER_DONATE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontWeight: 600,
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={() => setDonateDialogOpen(false)}
                      >
                        {donateLinkLabel}
                      </Link>
                    </Stack>
                  </DialogContent>
                </Dialog>
                <Stack
                  direction="row"
                  spacing={0.2}
                  aria-label="Social and support links"
                  data-testid="footer-social-links"
                >
                  {socialLinks.map((link) => (
                    <Tooltip key={link.label} title={link.label}>
                      <span>
                        <IconButton
                          component={Link}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.label}
                          size="small"
                          sx={{
                            color: footerTextSecondary,
                            p: { xs: 0.35, md: 0.45 },
                            '&:hover': { color: footerTextPrimary },
                          }}
                        >
                          {renderSocialIcon(link.label)}
                        </IconButton>
                      </span>
                    </Tooltip>
                  ))}
                </Stack>
                <Typography
                  variant="caption"
                  color={footerTextSecondary}
                  data-testid="footer-copyright"
                  sx={{
                    fontSize: { xs: '0.68rem', md: '0.74rem' },
                    textAlign: { xs: 'left', sm: 'right' },
                  }}
                >
                  © {new Date().getFullYear()} WRDLNKDN. All rights reserved.
                </Typography>
              </Stack>
            </Box>
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
    </>
  );
};
