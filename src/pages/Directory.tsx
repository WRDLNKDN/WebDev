import { Box, Container, Paper, Typography } from '@mui/material';

export const Directory = () => {
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
          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
            Directory
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Hook this up to your public profiles listing when ready.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};