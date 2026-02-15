import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import type { Weirdling } from '../../types/weirdling';

interface WeirdlingBannerSlotProps {
  weirdlings: Weirdling[] | null | undefined;
  onRemove?: (id: string) => void | Promise<void>;
  onAddClick?: () => void;
}

/** Compact Weirdling display for the IdentityHeader right slot */
export const WeirdlingBannerSlot = ({
  weirdlings,
  onRemove,
  onAddClick,
}: WeirdlingBannerSlotProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const list = Array.isArray(weirdlings) ? weirdlings : [];
  const count = list.length;
  const current = count > 0 ? list[currentIndex % count] : null;

  if (weirdlings === undefined) {
    return (
      <Box sx={{ py: 3, px: 2, minWidth: 160 }}>
        <Typography variant="caption" color="text.secondary">
          Loading…
        </Typography>
      </Box>
    );
  }

  if (count === 0) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ minWidth: 160, maxWidth: 220 }}>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {onRemove && current && (
          <IconButton
            size="small"
            aria-label={`Remove ${current.displayName}`}
            onClick={() => void onRemove(current.id)}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              zIndex: 1,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              width: 24,
              height: 24,
              '&:hover': { bgcolor: 'error.main' },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
        {current?.avatarUrl && (
          <Box
            component="img"
            src={current.avatarUrl}
            alt={current.displayName}
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.15)',
              flexShrink: 0,
            }}
          />
        )}
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {current?.displayName}
          </Typography>
          {current?.roleVibe && (
            <Typography variant="caption" color="primary.main">
              {current.roleVibe}
            </Typography>
          )}
          <Button
            {...(onAddClick
              ? { onClick: onAddClick }
              : { component: RouterLink, to: '/weirdling/create' })}
            variant="outlined"
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 12 }} />}
            sx={{
              alignSelf: 'flex-start',
              mt: 0.5,
              py: 0.25,
              px: 1,
              minWidth: 0,
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              '& .MuiButton-startIcon': { mr: 0.5 },
            }}
          >
            Edit
          </Button>
        </Stack>
      </Box>
      {count > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={0.5}
        >
          <IconButton
            size="small"
            onClick={() => setCurrentIndex((i) => (i - 1 + count) % count)}
            sx={{ color: 'rgba(255,255,255,0.6)', p: 0.25 }}
            aria-label="Previous"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          {list.map((_, i) => (
            <Box
              key={i}
              component="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Weirdling ${i + 1}`}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                p: 0,
                border: 'none',
                cursor: 'pointer',
                bgcolor:
                  i === currentIndex % count
                    ? 'primary.main'
                    : 'rgba(255,255,255,0.3)',
                '&:hover': {
                  bgcolor:
                    i === currentIndex % count
                      ? 'primary.light'
                      : 'rgba(255,255,255,0.5)',
                },
              }}
            />
          ))}
          <IconButton
            size="small"
            onClick={() => setCurrentIndex((i) => (i + 1) % count)}
            sx={{ color: 'rgba(255,255,255,0.6)', p: 0.25 }}
            aria-label="Next"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}
    </Stack>
  );
};
