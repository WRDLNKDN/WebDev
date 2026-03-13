import React from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';

void React;

type DirectoryEmptyStateProps = {
  hasActiveFilters: boolean;
  isSearchActive?: boolean;
  onClearFilters?: () => void;
  clearFiltersLabel?: string;
};

export const DirectoryEmptyState = ({
  hasActiveFilters,
  isSearchActive = false,
  onClearFilters,
  clearFiltersLabel = 'Clear filters',
}: DirectoryEmptyStateProps) => {
  const title = hasActiveFilters ? 'No members found' : 'No results';
  const description = hasActiveFilters
    ? isSearchActive
      ? 'No members match your search or filters. Try adjusting your search terms or clear one or more filters.'
      : 'No members match your filters. Try adjusting or clearing a filter.'
    : 'The directory is empty.';

  return (
    <Paper
      elevation={0}
      sx={{
        py: { xs: 6, md: 8 },
        px: 4,
        textAlign: 'center',
        borderRadius: 3,
        bgcolor: 'rgba(18,22,36,0.7)',
        border: '1px dashed rgba(141,188,229,0.22)',
      }}
      data-testid="directory-empty-state"
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
      >
        {hasActiveFilters && onClearFilters ? (
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
            {clearFiltersLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
};
