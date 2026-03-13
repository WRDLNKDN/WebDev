import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import { DirectoryEmptyState } from '../../components/directory/DirectoryEmptyState';
import { DirectoryRow } from '../../components/directory/DirectoryRow';
import type { DirectoryMember } from '../../lib/api/directoryApi';

type Props = {
  rows: DirectoryMember[];
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  hasActiveFilters: boolean;
  isSearchActive?: boolean;
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
  isSearchActive = false,
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
      <DirectoryEmptyState
        hasActiveFilters={hasActiveFilters}
        isSearchActive={isSearchActive}
        onClearFilters={onClearFilters}
      />
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
