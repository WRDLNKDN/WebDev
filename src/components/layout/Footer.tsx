import {
  alpha,
  Box,
  Collapse,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FacebookIcon from '@mui/icons-material/Facebook';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics/trackEvent';
import {
  FOOTER_DONATE_URL,
  FOOTER_SECTIONS,
  FOOTER_SOCIAL_LINKS,
  type FooterLink,
} from './footerConfig';

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back when the Clipboard API exists but denies the write.
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'absolute';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);
  if (!copied) {
    throw new Error('Clipboard copy failed');
  }
};

export const Footer = () => {
  const theme = useTheme();
  const location = useLocation();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
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
      hasPart: FOOTER_SECTIONS.map((section) => ({
        '@type': 'SiteNavigationElement',
        name: section.title,
        url: section.links.map((link) =>
          link.external ? link.href : `${origin}${link.href}`,
        ),
      })),
    };
  }, []);

  const donateDomain = useMemo(() => {
    try {
      return new URL(FOOTER_DONATE_URL).host.replace(/^www\./i, '');
    } catch {
      return FOOTER_DONATE_URL;
    }
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

  const openDonateModal = () => {
    setCopyFeedback(null);
    setDonateModalOpen(true);
    closeAllSections();
    trackEvent('footer_donate_modal_open', {
      source: 'footer',
      target: FOOTER_DONATE_URL,
    });
  };

  const closeDonateModal = () => {
    setDonateModalOpen(false);
    setCopyFeedback(null);
  };

  const handleCopyDonateLink = async () => {
    try {
      await copyTextToClipboard(FOOTER_DONATE_URL);
      setCopyFeedback('Donation link copied.');
      trackEvent('footer_donate_copy_click', {
        source: 'footer_modal',
        target: FOOTER_DONATE_URL,
      });
    } catch {
      setCopyFeedback('Copy failed. Copy the link manually.');
    }
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
          pt: { xs: 0.75, sm: 1, md: 1.2 },
          pb: {
            xs: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
            sm: 1,
            md: 1.2,
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
          <Grid
            container
            alignItems="start"
            spacing={{ xs: 0.85, sm: 1.1, md: 1.5 }}
          >
            <Grid
              size={{ xs: 12, sm: 6, md: 3 }}
              sx={{ order: { xs: 1, md: 1 } }}
            >
              <Stack
                spacing={0.3}
                sx={{
                  alignItems: { xs: 'flex-start', md: 'flex-start' },
                  textAlign: 'left',
                  pr: { md: 0.75 },
                }}
              >
                <Stack direction="row" spacing={0.35} alignItems="center">
                  <EmojiEventsIcon
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      fontSize: { xs: 20, sm: 22, md: 24 },
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
                      width: { xs: 28, sm: 30, md: 34 },
                      height: { xs: 28, sm: 30, md: 34 },
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
                      width: { xs: 114, sm: 138, md: 156 },
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
                    fontSize: { sm: '0.78rem', md: '0.84rem' },
                    lineHeight: 1.35,
                  }}
                >
                  Business, but weirder.
                </Typography>
              </Stack>
            </Grid>

            <Grid
              size={{ xs: 12, sm: 6, md: 6 }}
              sx={{ order: { xs: 2, md: 2 } }}
            >
              <Box
                aria-label="Footer navigation sections"
                sx={{
                  display: 'grid',
                  width: '100%',
                  maxWidth: { md: 380 },
                  mx: { md: 'auto' },
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(2, minmax(0, 180px))',
                  },
                  gap: { xs: 0.45, sm: 0.65, md: 0.8 },
                  alignItems: 'start',
                  justifyContent: { md: 'center' },
                }}
              >
                {FOOTER_SECTIONS.map((section) => {
                  const open = expandedSection === section.title;
                  const panelId = `footer-panel-${section.title.toLowerCase()}`;
                  return (
                    <Box
                      key={section.title}
                      data-testid={`footer-section-${section.title.toLowerCase()}`}
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
                          px: { xs: 0.8, sm: 1.05, md: 1.2 },
                          py: { xs: 0.52, sm: 0.68, md: 0.74 },
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
                          sx={{ fontSize: { xs: '0.78rem', md: '0.86rem' } }}
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
                            py: 0.1,
                            px: { xs: 0.8, sm: 1.05, md: 1.2 },
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
                            const active = isActiveLink(
                              link.href,
                              link.external,
                            );
                            const commonSx = {
                              display: 'inline-flex',
                              alignItems: 'center',
                              py: { xs: 0.4, md: 0.56 },
                              fontSize: { xs: '0.78rem', md: '0.86rem' },
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
                                    state={
                                      link.href === '/advertise'
                                        ? { backgroundLocation: location }
                                        : undefined
                                    }
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
                order: { xs: 3, md: 3 },
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
                spacing={0.45}
                alignItems={{
                  xs: 'flex-start',
                  sm: 'flex-end',
                  md: 'flex-end',
                }}
                sx={{ pt: { xs: 0.15, md: 0.05 } }}
              >
                <Box
                  component="button"
                  type="button"
                  data-testid="footer-donate-link"
                  onClick={openDonateModal}
                  aria-label="Donate to WRDLNKDN"
                  aria-haspopup="dialog"
                  aria-controls="footer-donate-modal"
                  sx={{
                    all: 'unset',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    fontWeight: 800,
                    letterSpacing: 0.35,
                    color: 'white',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    fontSize: { xs: '0.78rem', md: '0.84rem' },
                    lineHeight: 1,
                    minHeight: 40,
                    px: 1.8,
                    py: 0.55,
                    borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.22)',
                    background:
                      'linear-gradient(135deg, #0d5f59 0%, #118f87 42%, #1ecfb9 100%)',
                    width: '100%',
                    alignSelf: 'stretch',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    boxShadow:
                      '0 8px 18px rgba(20,184,166,0.24), inset 0 1px 0 rgba(255,255,255,0.16)',
                    transition: reduceMotion
                      ? 'none'
                      : 'box-shadow 140ms ease, background 140ms ease, border-color 140ms ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))',
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      textDecoration: 'none',
                      background:
                        'linear-gradient(135deg, #0b5550 0%, #0f7a74 42%, #17b9a5 100%)',
                      borderColor: 'rgba(255,255,255,0.38)',
                      boxShadow:
                        '0 10px 22px rgba(20,184,166,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
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
                <Stack
                  direction="row"
                  spacing={0.2}
                  aria-label="Social and support links"
                  data-testid="footer-social-links"
                >
                  {FOOTER_SOCIAL_LINKS.map((link) => (
                    <IconButton
                      key={link.label}
                      component={Link}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        p: { xs: 0.35, md: 0.45 },
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {renderSocialIcon(link.label)}
                    </IconButton>
                  ))}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  data-testid="footer-copyright"
                  sx={{
                    fontSize: { xs: '0.68rem', md: '0.74rem' },
                    textAlign: { xs: 'left', sm: 'right' },
                  }}
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

      <Dialog
        id="footer-donate-modal"
        open={donateModalOpen}
        onClose={closeDonateModal}
        fullWidth
        maxWidth="xs"
        aria-labelledby="footer-donate-modal-title"
        PaperProps={{
          sx: {
            bgcolor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.96)
                : theme.palette.background.paper,
            color: 'text.primary',
            border: '1px solid',
            borderColor: dividerColor,
            borderRadius: 2,
            backgroundImage: 'none',
            mx: { xs: 1.25, sm: 2 },
          },
        }}
      >
        <DialogTitle
          id="footer-donate-modal-title"
          sx={{ pr: 6, pb: 1.25, fontWeight: 700 }}
        >
          Donate to WRDLNKDN
          <IconButton
            onClick={closeDonateModal}
            aria-label="Close donate modal"
            sx={{ position: 'absolute', right: 10, top: 10 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ borderColor: dividerColor, py: { xs: 2, sm: 2.5 } }}
        >
          <Stack spacing={1.75}>
            <Stack spacing={1.2}>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}
              >
                Donation Link
              </Typography>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <Link
                  data-testid="footer-donate-modal-url"
                  href={FOOTER_DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: { xs: '0.9rem', sm: '0.95rem' },
                    fontWeight: 600,
                    fontFamily:
                      '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
                    px: 0.8,
                    py: 0.35,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: dividerColor,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  [{donateDomain}]
                </Link>
                <IconButton
                  data-testid="footer-donate-copy-button"
                  aria-label="Copy donation link"
                  onClick={() => void handleCopyDonateLink()}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    border: '1px solid',
                    borderColor: dividerColor,
                    borderRadius: 1,
                    '&:hover': {
                      color: 'text.primary',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
              {copyFeedback ? (
                <Typography
                  data-testid="footer-donate-copy-feedback"
                  variant="body2"
                  role="status"
                  aria-live="polite"
                  sx={{
                    color: copyFeedback.startsWith('Donation')
                      ? 'success.main'
                      : 'error.main',
                  }}
                >
                  {copyFeedback}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
