import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
        bgcolor: 'rgba(0,0,0,0.85)',
        color: 'rgba(255,255,255,0.8)',
        py: 2,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
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
              src="/assets/logo.png"
              alt="WRDLNKDN"
              sx={{ height: 56, width: 'auto', display: 'block' }}
            />
          </Link>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © {new Date().getFullYear()} WRDLNKDN. Stay weird. Build cool
            stuff.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Link
            component={RouterLink}
            to="/directory"
            color="inherit"
            underline="hover"
            variant="body2"
          >
            Directory
          </Link>
          <Link
            component={RouterLink}
            to="/store"
            color="inherit"
            underline="hover"
            variant="body2"
          >
            Store
          </Link>
          <Link
            component={RouterLink}
            to="/guidelines"
            color="inherit"
            underline="hover"
            variant="body2"
          >
            Guidelines
          </Link>
          <Link
            component={RouterLink}
            to="/terms"
            color="inherit"
            underline="hover"
            variant="body2"
          >
            Terms
          </Link>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
