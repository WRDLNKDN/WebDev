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
              Use the public site to browse approved profiles. Admins can review
              pending registrations and moderate members.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ pt: 1 }}
            >
              <Button
                component={RouterLink}
                to="/directory"
                variant="contained"
                size="large"
              >
                View directory
              </Button>

              <Button
                component={RouterLink}
                to="/admin"
                variant="outlined"
                size="large"
              >
                Admin moderation
              </Button>
            </Stack>

            <Box sx={{ pt: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Tip: Admin requires a service role key. Do not use it in a
                public deployment.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
