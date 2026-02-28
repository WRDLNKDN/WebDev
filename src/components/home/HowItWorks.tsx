import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { Box, Container, Grid, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const steps = [
  {
    icon: TouchAppIcon,
    title: 'Join',
    body: 'Join with Google or Microsoft. No lengthy forms—just get in.',
    to: '/join',
  },
  {
    icon: PsychologyIcon,
    title: 'Set your intent',
    body: 'Define your values and how you want to show up in the network.',
    to: '/join',
  },
  {
    icon: PersonSearchIcon,
    title: 'Follow people',
    body: 'Discover and follow others who share your values and goals.',
    to: '/directory',
  },
  {
    icon: GroupAddIcon,
    title: 'Show up',
    body: 'Participate: post, comment, and build real professional connections.',
    to: '/feed',
  },
];

export const HowItWorks = () => {
  return (
    <Box
      component="section"
      aria-labelledby="how-it-works-heading"
      sx={{
        py: 8,
        bgcolor: 'rgba(10, 12, 22, 0.95)',
        borderTop: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Container maxWidth="lg">
        <Typography
          id="how-it-works-heading"
          component="h2"
          variant="h4"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            textAlign: 'center',
            mb: 5,
          }}
        >
          How It Works
        </Typography>
        <Grid container spacing={4}>
          {steps.map(({ icon: Icon, title, body, to }) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={title}>
              <Box
                component={RouterLink}
                to={to}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  p: 2,
                  borderRadius: 2,
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'primary.dark',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Icon sx={{ fontSize: 28, color: 'primary.light' }} />
                </Box>
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {body}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};
