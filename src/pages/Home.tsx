// src/pages/Home.tsx
//
// Splash / landing page for the public site.
// Primary actions:
// - Register (creates a pending profile request)
// - Browse directory (approved members only; RLS enforced)

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export const Home = () => {
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
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              WeirdLinkedIn
            </Typography>

            <Typography variant="body1" sx={{ opacity: 0.85 }}>
              Professional networking, but human.
            </Typography>

            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Submit a profile request to join. Once approved, you will appear
              in the public directory.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ pt: 1 }}
            >
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                size="large"
              >
                Request membership
              </Button>

              <Button
                component={RouterLink}
                to="/directory"
                variant="outlined"
                size="large"
              >
                Browse directory
              </Button>
            </Stack>

            <Box sx={{ pt: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Admin? Go to{' '}
                <Typography
                  component={RouterLink}
                  to="/admin"
                  variant="caption"
                  sx={{ textDecoration: 'underline' }}
                >
                  /admin
                </Typography>{' '}
                and use an admin token.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
