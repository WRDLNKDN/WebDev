import { Box, Container, Link, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const About = () => {
  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            About WRDLNKDN
          </Typography>
          <Typography variant="body1" paragraph>
            WRDLNKDN is a professional network with personality — “a weird place
            to do business.” We help creators, builders, and professionals
            connect meaningfully while staying authentic.
          </Typography>

          <Typography
            id="why"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Why WRDLNKDN
          </Typography>
          <Typography variant="body1" paragraph>
            Most professional platforms optimize for engagement and scale. We
            optimize for trust, clarity, and real connections. Whether you’re
            building in public, looking for collaborators, or just want a
            profile that feels like you, WRDLNKDN gives you the tools without
            the performative pressure.
          </Typography>

          <Typography
            id="values"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Values and Mission
          </Typography>
          <Typography variant="body1" paragraph>
            Our mission is to make professional presence personal again. We
            believe in: authenticity over polish, quality connections over
            follower counts, and building in the open. We’re here to support
            contributors, volunteers, and community voices — not to turn you
            into a brand.
          </Typography>

          <Typography
            id="contact"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Contact
          </Typography>
          <Typography variant="body1" paragraph>
            For general inquiries, partnerships, or feedback, reach us at{' '}
            <Link
              href="mailto:wrdlnkdn@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              wrdlnkdn@gmail.com
            </Link>
            . For community guidelines and legal notices, see our{' '}
            <Link component={RouterLink} to="/guidelines">
              Community Guidelines
            </Link>{' '}
            and the{' '}
            <Link
              href="https://github.com/WRDLNKDN/Agreements/wiki/Legal"
              target="_blank"
              rel="noopener noreferrer"
            >
              Legal index
            </Link>
            .
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default About;
