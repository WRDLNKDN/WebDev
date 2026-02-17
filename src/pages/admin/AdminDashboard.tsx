import CampaignIcon from '@mui/icons-material/Campaign';
import PeopleIcon from '@mui/icons-material/People';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
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
    title: 'Profile Moderation',
    description:
      'Review pending registrations, approve or reject profiles, and manage member status.',
    to: '/admin/moderation',
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
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
];

export const AdminDashboard = () => (
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
              borderColor: 'rgba(255,255,255,0.12)',
              bgcolor: 'rgba(255,255,255,0.03)',
              transition: 'all 0.2s',
              overflow: 'hidden',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.25)',
                bgcolor: 'rgba(255,255,255,0.06)',
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
