import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha, Box, Collapse, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { Theme } from '@mui/material/styles';
import type { FooterLink, FooterSection } from '../footerConfig';

type FooterNavSectionsProps = {
  sections: FooterSection[];
  expandedSection: string | null;
  toggleSection: (title: string) => void;
  reduceMotion: boolean;
  dividerColor: string;
  theme: Theme;
  isActiveLink: (href: string, external?: boolean) => boolean;
  onLinkClick: (link: FooterLink) => void;
};

export const FooterNavSections = ({
  sections,
  expandedSection,
  toggleSection,
  reduceMotion,
  dividerColor,
  theme,
  isActiveLink,
  onLinkClick,
}: FooterNavSectionsProps) => (
  <Box
    aria-label="Footer navigation sections"
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
      gap: 1.25,
    }}
  >
    {sections.map((section) => {
      const open = expandedSection === section.title;
      const sectionKey = section.title.toLowerCase().replace(/\s+/g, '-');
      const panelId = `footer-panel-${sectionKey}`;
      return (
        <Box
          key={section.title}
          data-testid={`footer-section-${sectionKey}`}
          sx={{
            border: '1px solid',
            borderColor: dividerColor,
            borderRadius: 1.5,
            overflow: { xs: 'hidden', md: 'visible' },
            position: 'relative',
            backgroundColor: alpha(theme.palette.background.paper, 0.2),
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
              pr: { xs: 1.1, md: 1.35 },
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
                width: 20,
                height: 20,
                ml: 1,
                flexShrink: 0,
                transition: reduceMotion ? 'none' : 'transform 180ms ease',
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
                bottom: { md: 'calc(100% + 8px)' },
                left: { md: 0 },
                right: { md: 0 },
                zIndex: { md: 4 },
                border: { md: '1px solid' },
                borderRadius: { md: 1.5 },
                boxShadow: { md: '0 10px 28px rgba(0,0,0,0.28)' },
                maxHeight: { xs: '44vh', md: 'min(42vh, 320px)' },
                overflowY: 'auto',
                overscrollBehavior: 'contain',
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
                        onClick={() => onLinkClick(link)}
                        sx={commonSx}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <Link
                        component={RouterLink}
                        to={link.href}
                        onClick={() => onLinkClick(link)}
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
);
