import {
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

const GITHUB_ORG = 'https://github.com/WRDLNKDN';

export const Platform = () => {
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
            Open Source and Platform
          </Typography>
          <Typography variant="body1" paragraph>
            WRDLNKDN is built in the open. Our code, docs, and governance live
            on GitHub. Here’s where to find everything.
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              GitHub Organization
            </Typography>
            <Typography variant="body2" paragraph sx={{ mb: 0 }}>
              All repos — web app, agreements, tooling — are under the WRDLNKDN
              organization.
            </Typography>
            <Button
              href={GITHUB_ORG}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="small"
            >
              GitHub / WRDLNKDN
            </Button>
          </Stack>

          <Typography
            id="docs"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Documentation / Wiki
          </Typography>
          <Typography variant="body1" paragraph>
            Technical docs, architecture decisions, and contribution guides live
            in the repo READMEs and the{' '}
            <Link
              href={`${GITHUB_ORG}/WebDev`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WebDev repo
            </Link>
            . The project wiki (when enabled) and the docs folder in the repo
            are the source of truth for setup, deployment, and APIs.
          </Typography>

          <Typography
            id="roadmap"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Roadmap or Project Boards
          </Typography>
          <Typography variant="body1" paragraph>
            We use GitHub Projects and issues for roadmap and backlog. Check the
            WebDev repo for open issues and project boards. Epics and acceptance
            criteria are documented in the docs/architecture folder in the repo.
          </Typography>

          <Typography
            id="overview"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Platform Overview or APIs
          </Typography>
          <Typography variant="body1" paragraph>
            The platform is a Vite + React frontend with a Node/Express API and
            Supabase for auth and data. Public APIs (e.g. Weirdling generation,
            profile directory) are documented in the codebase and in
            docs/architecture. There is no separate public API portal yet; use
            the repo and README for integration details.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Platform;
