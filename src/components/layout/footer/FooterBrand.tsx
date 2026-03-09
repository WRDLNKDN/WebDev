import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Stack, Typography } from '@mui/material';

export const FooterBrand = () => (
  <Stack
    spacing={0.2}
    sx={{
      alignItems: { xs: 'flex-start', md: 'center' },
      textAlign: { xs: 'left', md: 'center' },
      pr: { md: 0 },
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
          objectPosition: { xs: 'left center', md: 'center' },
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
);
