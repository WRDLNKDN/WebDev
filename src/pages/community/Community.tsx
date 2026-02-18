import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export const Community = () => {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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
            Community and Participation
          </Typography>
          <Typography variant="body1" paragraph>
            WRDLNKDN runs on its community. Here is how you can get involved.
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Join the Community
            </Typography>
            <Typography variant="body2" paragraph sx={{ mb: 0 }}>
              Create a profile and join the directory. Join to get your
              Weirdling and connect with others.
            </Typography>
            <Button
              component={RouterLink}
              to="/join"
              variant="contained"
              size="small"
            >
              Join
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Submit content
            </Typography>
            <Typography variant="body2" paragraph sx={{ mb: 0 }}>
              Have a talk or video worth sharing? Submit YouTube links or upload
              raw video for consideration on the WRDLNKDN channel.
            </Typography>
            <Button
              component={RouterLink}
              to="/submit"
              variant="outlined"
              size="small"
            >
              Submit content
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Browse playlists
            </Typography>
            <Typography variant="body2" paragraph sx={{ mb: 0 }}>
              Curated community picks and featured content.
            </Typography>
            <Button
              component={RouterLink}
              to="/playlists"
              variant="outlined"
              size="small"
            >
              Playlists
            </Button>
          </Stack>

          <Typography
            id="contributors"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Contributors and Volunteers
          </Typography>
          <Typography variant="body1" paragraph>
            We welcome contributors to code, docs, and design. Our repos are on
            GitHub. To volunteer for events or outreach, email
            info@wrdlnkdn.com.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
            Community Voices
          </Typography>
          <Typography variant="body2" paragraph sx={{ mb: 1 }}>
            See who is in the network. Browse the directory.
          </Typography>
          <Button
            component={RouterLink}
            to="/directory"
            variant="outlined"
            size="small"
          >
            Directory
          </Button>

          <Typography
            id="discord"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Discord
          </Typography>
          <Typography variant="body1" paragraph>
            Our Discord server is where the community chats and shares projects.
            Invite links are shared via the site and newsletter when active.
            Email info@wrdlnkdn.com for an invite.
          </Typography>

          <Typography
            id="events"
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 2, scrollMarginTop: 4 }}
          >
            Events or Meetups
          </Typography>
          <Typography variant="body1" paragraph>
            We run occasional online meetups. Dates and registration are posted
            on the homepage when scheduled. No events are currently listed.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Community;
