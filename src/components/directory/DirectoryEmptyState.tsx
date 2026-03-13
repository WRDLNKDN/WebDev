import React from 'react';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

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
  const title = hasActiveFilters ? 'No members found' : 'No members yet';
  const description = hasActiveFilters
    ? isSearchActive
      ? 'No members match your search or filters right now. Try broadening your search or clearing one of the filters.'
      : 'No members match these filters right now. Try widening your search or removing a filter.'
    : 'Try searching by name, skills, industry, or location, or check back later as more members join the directory.';
  const suggestions = hasActiveFilters
    ? [
        'Try a broader name, skill, or industry search.',
        'Remove one or more filters to widen the results.',
        'Reset filters and browse the full directory again.',
      ]
    : [
        'Search by the kind of work, skills, or location you need.',
        'Browse later as new members and profiles continue to appear.',
        'Start broad, then add filters once you spot the right direction.',
      ];

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 4.5, md: 5.5 },
        px: { xs: 2.25, sm: 3.25, md: 4 },
        textAlign: 'center',
        borderRadius: 3.5,
        bgcolor: 'rgba(12,18,31,0.78)',
        border: '1px solid rgba(141,188,229,0.16)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 42px rgba(4,10,25,0.18)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at top, rgba(56,132,210,0.22), transparent 48%), linear-gradient(rgba(141,188,229,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(141,188,229,0.08) 1px, transparent 1px)',
          backgroundSize: 'auto, 28px 28px, 28px 28px',
          backgroundPosition: 'center top, -1px -1px, -1px -1px',
          opacity: 0.5,
        },
      }}
      data-testid="directory-empty-state"
    >
      <Stack
        spacing={{ xs: 2.25, md: 2.75 }}
        alignItems="center"
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: '#9fd4ff',
            bgcolor: 'rgba(56,132,210,0.16)',
            border: '1px solid rgba(141,188,229,0.3)',
            boxShadow:
              '0 0 0 10px rgba(56,132,210,0.06), 0 18px 28px rgba(2,8,20,0.24)',
          }}
        >
          <SearchOffRoundedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Box sx={{ maxWidth: 620 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 0.8,
              color: 'rgba(159,212,255,0.8)',
              letterSpacing: '0.12em',
            }}
          >
            Discovery status
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.25 }}>
            {title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mb: 2,
              lineHeight: 1.65,
              fontSize: { xs: '0.97rem', md: '1rem' },
            }}
          >
            {description}
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{
              justifyContent: 'center',
              flexWrap: 'wrap',
              mt: 0.5,
            }}
          >
            {suggestions.map((suggestion) => (
              <Box
                key={suggestion}
                sx={{
                  px: 1.35,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(141,188,229,0.12)',
                  color: 'rgba(223,232,245,0.76)',
                  maxWidth: { xs: '100%', md: 190 },
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                  {suggestion}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
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
                minWidth: 180,
                px: 4,
                py: 1.25,
                borderRadius: 2.25,
                borderColor: 'rgba(141,188,229,0.50)',
                color: 'rgba(255,255,255,0.92)',
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
          {!hasActiveFilters ? (
            <Typography
              variant="body2"
              sx={{ color: 'rgba(191,214,239,0.7)', maxWidth: 440 }}
            >
              Start with a broad search, then narrow by industry, connection, or
              location once you see what is available.
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
};
