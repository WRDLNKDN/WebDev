import { Box, Container } from '@mui/material';
import { AdminGate } from './AdminGate';
import { ChatReportsPage } from './ChatReportsPage';

const BG_SX = {
  minHeight: '100vh',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column' as const,
  px: 2,
  py: 6,
  backgroundColor: '#05070f',
  backgroundImage: 'url(/assets/landing-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden' as const,
  '::before': {
    content: '""',
    position: 'absolute' as const,
    inset: 0,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.35), rgba(0,0,0,0.85))',
  },
};

const CARD_SX = {
  position: 'relative' as const,
  width: '100%',
  maxWidth: 1400,
  mx: 'auto' as const,
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.12)',
  bgcolor: 'rgba(16, 18, 24, 0.70)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
  p: { xs: 3, sm: 4 },
  color: '#fff',
};

export const AdminChatReports = () => (
  <AdminGate>
    <Box sx={BG_SX}>
      <Container maxWidth="xl" sx={CARD_SX}>
        <ChatReportsPage />
      </Container>
    </Box>
  </AdminGate>
);
