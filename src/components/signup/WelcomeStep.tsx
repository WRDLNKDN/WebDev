import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useSignup } from '../../context/useSignup';

export const WelcomeStep = () => {
  const { goToStep } = useSignup();

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Welcome to WRDLNKDN
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Professional networking, but human.
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            This is a curated directory. You submit a request, admins review it,
            and once approved you appear in the member list.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => goToStep('identity')}
          >
            Start signup
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};
