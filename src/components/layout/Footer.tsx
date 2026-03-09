import {
  alpha,
  Box,
  Container,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics/trackEvent';
import { FOOTER_SECTIONS, type FooterLink } from './footerConfig';
import { FooterBrand } from './footer/FooterBrand';
import { FooterNavSections } from './footer/FooterNavSections';
import { FooterRightRail } from './footer/FooterRightRail';

type FooterProps = {
  showChatLink?: boolean;
};

export const Footer = ({ showChatLink = false }: FooterProps) => {
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
  const companySections = useMemo(
    () => sections.filter((section) => section.title === 'Company'),
    [sections],
  );
  const legalSections = useMemo(
    () => sections.filter((section) => section.title === 'Legal Notices'),
    [sections],
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
      { root: null, threshold: 0.16 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const closeAllSections = () => setExpandedSection(null);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      queueMicrotask(() => closeAllSections());
    };
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const node = footerRef.current;
      if (!node) return;
      const target = event.target;
      if (target instanceof Node && !node.contains(target)) closeAllSections();
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
          spacing={{ xs: 0.7, sm: 0.9, md: 1.1 }}
        >
          <Grid size={{ xs: 12, md: 3 }} sx={{ order: { xs: 1, md: 1 } }}>
            <FooterNavSections
              sections={companySections}
              expandedSection={expandedSection}
              toggleSection={(title) =>
                setExpandedSection((prev) => (prev === title ? null : title))
              }
              reduceMotion={reduceMotion}
              dividerColor={dividerColor}
              theme={theme}
              isActiveLink={isActiveLink}
              onLinkClick={handleFooterLinkClick}
            />
          </Grid>

          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              order: { xs: 2, md: 2 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 0.8,
            }}
          >
            <FooterBrand />
            <Box sx={{ width: { xs: '100%', md: 'min(380px, 100%)' } }}>
              <FooterNavSections
                sections={legalSections}
                expandedSection={expandedSection}
                toggleSection={(title) =>
                  setExpandedSection((prev) => (prev === title ? null : title))
                }
                reduceMotion={reduceMotion}
                dividerColor={dividerColor}
                theme={theme}
                isActiveLink={isActiveLink}
                onLinkClick={handleFooterLinkClick}
              />
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
            <FooterRightRail
              dividerColor={dividerColor}
              reduceMotion={reduceMotion}
              theme={theme}
            />
          </Grid>
        </Grid>
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(footerStructuredData),
        }}
      />
    </Box>
  );
};
