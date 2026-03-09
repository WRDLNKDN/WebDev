import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';

export const ProfileReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <Box component="main" sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          Review Profile: {id}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
          Detailed profile review page. Functionality coming soon.
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/admin')}>
          Back to Admin
        </Button>
      </Container>
    </Box>
  );
};

export default ProfileReview;
