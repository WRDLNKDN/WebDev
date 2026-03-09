import FacebookIcon from '@mui/icons-material/Facebook';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import {
  alpha,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { Theme } from '@mui/material/styles';
import { trackEvent } from '../../../lib/analytics/trackEvent';
import {
  FOOTER_DONATE_QR_ASSET,
  FOOTER_DONATE_URL,
  FOOTER_SOCIAL_LINKS,
} from '../footerConfig';

type FooterRightRailProps = {
  dividerColor: string;
  reduceMotion: boolean;
  theme: Theme;
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

export const FooterRightRail = ({
  dividerColor,
  reduceMotion,
  theme,
}: FooterRightRailProps) => {
  const [donateDialogOpen, setDonateDialogOpen] = useState(false);

  return (
    <Stack
      spacing={1}
      alignItems={{ xs: 'flex-start', sm: 'flex-end', md: 'flex-end' }}
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
          minWidth: 0,
          alignSelf: { xs: 'flex-start', sm: 'flex-end' },
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
          px: 2.15,
          py: 0.45,
          borderRadius: 1,
          border: '1px solid rgba(255,255,255,0.22)',
          background:
            'linear-gradient(135deg, #0d5f59 0%, #118f87 42%, #1ecfb9 100%)',
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
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: dividerColor,
            },
          },
        }}
      >
        <DialogTitle id="donate-dialog-title">Donate to WRDLNKDN</DialogTitle>
        <DialogContent id="donate-dialog-description">
          <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
            <Box
              component="img"
              src={FOOTER_DONATE_QR_ASSET}
              alt="Donate QR code"
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
              Pay online at pay.wrdlnkdn.com
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
        {FOOTER_SOCIAL_LINKS.map((link) => (
          <Tooltip key={link.label} title={link.label}>
            <IconButton
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
          </Tooltip>
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
  );
};
