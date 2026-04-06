import { Box, Container, Paper, Typography } from '@mui/material';
import { LAYOUT_READING_CONTAINER_MAX_WIDTH } from '../../theme/layoutTokens';
import type { ReactNode } from 'react';

const EFFECTIVE_LINE =
  'Effective Date: January 13, 2026 | Last Updated: January 13, 2026';

type LegalDocumentShellProps = {
  title: string;
  children: ReactNode;
};

export const LegalDocumentShell = ({
  title,
  children,
}: LegalDocumentShellProps) => (
  <Box sx={{ py: 6 }}>
    <Container maxWidth={LAYOUT_READING_CONTAINER_MAX_WIDTH}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {EFFECTIVE_LINE}
        </Typography>
        {children}
      </Paper>
    </Container>
  </Box>
);
