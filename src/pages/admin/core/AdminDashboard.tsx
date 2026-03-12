import CampaignIcon from '@mui/icons-material/Campaign';
import FlagIcon from '@mui/icons-material/Flag';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type SectionCard = {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
};

const SECTIONS: SectionCard[] = [
  {
    title: 'Content Moderation',
    description:
      'Review video submissions, approve, reject, or publish to playlists.',
    to: '/admin/content',
    icon: <VideoLibraryIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Chat Reports',
    description: 'Review and resolve reported chat messages and user conduct.',
    to: '/admin/chat-reports',
    icon: <ReportProblemIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Advertisers',
    description:
      'Manage feed advertisers. Add, edit, or deactivate ads shown every 6th post.',
    to: '/admin/advertisers',
    icon: <CampaignIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Community Partners',
    description:
      'Manage public partner listings on /community-partners independently from feed ads.',
    to: '/admin/community-partners',
    icon: <HandshakeIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Auth Callback Health',
    description:
      'Review recent callback timeout and error diagnostics in a dedicated health view.',
    to: '/admin/auth-callback-health',
    icon: <MonitorHeartIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Feature Flags',
    description:
      'Turn site features on or off (Events, Store, Directory, Groups, Chat, etc.).',
    to: '/admin/feature-flags',
    icon: <FlagIcon sx={{ fontSize: 40 }} />,
  },
];

export const AdminDashboard = () => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Welcome to the Admin Panel
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.85, mb: 3 }}>
        Select an area below to get started.
      </Typography>

      <Grid container spacing={2}>
        {SECTIONS.map((section) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 4 }}
            key={section.to}
            sx={{ minHeight: 180 }}
          >
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: 'rgba(156,187,217,0.26)',
                bgcolor: 'rgba(56,132,210,0.08)',
                transition: 'all 0.2s',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: 'rgba(141,188,229,0.42)',
                  bgcolor: 'rgba(56,132,210,0.14)',
                },
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={section.to}
                sx={{
                  height: '100%',
                  display: 'block',
                  textAlign: 'left',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ color: 'primary.main', mb: 1.5 }}>
                    {section.icon}
                  </Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {section.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
