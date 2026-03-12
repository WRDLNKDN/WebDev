import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { DirectoryRow } from '../../components/directory/DirectoryRow';
import type { DirectoryMember } from '../../lib/api/directoryApi';

type Props = {
  rows: DirectoryMember[];
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  hasActiveFilters: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  busy: boolean;
  onLoadMore: () => void;
  onClearFilters: () => void;
  onConnect: (id: string) => Promise<void>;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  onDisconnect: (member: DirectoryMember) => void;
  onBlock: (member: DirectoryMember) => void;
  onSkillClick: (skill: string) => void;
};

export const DirectoryResults = ({
  rows,
  loading,
  error,
  setError,
  hasActiveFilters,
  hasMore,
  loadingMore,
  busy,
  onLoadMore,
  onClearFilters,
  onConnect,
  onAccept,
  onDecline,
  onDisconnect,
  onBlock,
  onSkillClick,
}: Props) => (
  <>
    {error ? (
      <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
        {error}
      </Alert>
    ) : null}

    {loading && rows.length === 0 ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} />
      </Box>
    ) : rows.length === 0 ? (
      <Paper
        elevation={0}
        sx={{
          py: { xs: 6, md: 8 },
          px: 4,
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: 'rgba(18,22,36,0.7)',
          border: '1px dashed rgba(156,187,217,0.22)',
        }}
        data-testid="directory-empty-state"
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
          {hasActiveFilters ? 'No members found' : 'No results'}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {hasActiveFilters
            ? 'No members match your filters.'
            : 'The directory is empty.'}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
        >
          {hasActiveFilters ? (
            <Button
              variant="outlined"
              size="large"
              onClick={onClearFilters}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                px: 4,
                py: 1.25,
                borderRadius: 2,
                borderColor: 'rgba(141,188,229,0.50)',
                color: 'rgba(255,255,255,0.9)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(56,132,210,0.14)',
                },
              }}
              data-testid="directory-clear-filters"
            >
              Clear filters
            </Button>
          ) : null}
          <Button
            component={RouterLink}
            to="/join"
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#3884D2',
              fontWeight: 700,
              textTransform: 'none',
              px: 4,
              py: 1.25,
              borderRadius: 2,
              '&:hover': { bgcolor: '#3884D2' },
            }}
          >
            Join the Community
          </Button>
        </Stack>
      </Paper>
    ) : (
      <Stack spacing={{ xs: 1.25, md: 1.75 }}>
        {rows.map((member) => (
          <DirectoryRow
            key={member.id}
            member={member}
            onConnect={(id) => void onConnect(id)}
            onAccept={(id) => void onAccept(id)}
            onDecline={(id) => void onDecline(id)}
            onDisconnect={onDisconnect}
            onBlock={onBlock}
            onSkillClick={onSkillClick}
            busy={busy}
          />
        ))}
        {hasMore ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Button
              variant="outlined"
              onClick={onLoadMore}
              disabled={loadingMore}
              sx={{
                borderColor: 'rgba(141,188,229,0.38)',
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.4)',
                  bgcolor: 'rgba(56,132,210,0.10)',
                },
              }}
            >
              {loadingMore ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : null}
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </Box>
        ) : null}
      </Stack>
    )}
  </>
);
