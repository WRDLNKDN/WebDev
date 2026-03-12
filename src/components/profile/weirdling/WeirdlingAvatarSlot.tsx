import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { tinyGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';
import type { Weirdling } from '../../../types/weirdling';

interface WeirdlingAvatarSlotProps {
  /** List of Weirdlings to show (supports multiple). Undefined = loading. */
  weirdlings?: Weirdling[] | null;
  /** Called when user removes a Weirdling (id for future multi-remove) */
  onRemove?: (id: string) => void | Promise<void>;
}

/** Renders under the profile avatar: list of Weirdlings + "Add your weirdling". */
export const WeirdlingAvatarSlot = ({
  weirdlings,
  onRemove,
}: WeirdlingAvatarSlotProps) => {
  if (weirdlings === undefined) {
    return (
      <Box
        sx={{
          width: 80,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          …
        </Typography>
      </Box>
    );
  }

  const list = Array.isArray(weirdlings) ? weirdlings : [];

  return (
    <Stack
      spacing={1.5}
      alignItems="flex-end"
      sx={{ width: '100%', maxWidth: 140 }}
    >
      {list.map((w) => (
        <Box
          key={w.id}
          sx={{
            position: 'relative',
            minWidth: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          {onRemove && (
            <IconButton
              size="small"
              aria-label={`Remove ${w.displayName}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void onRemove(w.id);
              }}
              sx={{
                ...tinyGlassDangerIconButtonSx,
                position: 'absolute',
                top: -4,
                right: -4,
                zIndex: 1,
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          {w.avatarUrl && (
            <Box
              component="img"
              src={w.avatarUrl}
              alt={w.displayName}
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                objectFit: 'cover',
                border: '1px solid rgba(141,188,229,0.38)',
                mb: 0.5,
              }}
            />
          )}
          <Typography
            variant="caption"
            fontWeight={600}
            sx={{
              textAlign: 'right',
              lineHeight: 1.3,
              maxWidth: 120,
              wordBreak: 'break-word',
              mb: 0.5,
            }}
          >
            {w.displayName}
          </Typography>
          <Button
            component={RouterLink}
            to="/weirdling/create"
            variant="outlined"
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderColor: 'rgba(141,188,229,0.50)',
              color: 'white',
              py: 0.25,
              px: 1,
              minHeight: 0,
              fontSize: '0.75rem',
            }}
          >
            Edit
          </Button>
        </Box>
      ))}
      <Button
        component={RouterLink}
        to="/weirdling/create"
        variant="outlined"
        size="small"
        sx={{
          alignSelf: 'flex-end',
          borderColor: 'primary.main',
          color: 'primary.main',
          '&:hover': { borderColor: 'primary.light', color: 'primary.light' },
        }}
      >
        Add your weirdling
      </Button>
    </Stack>
  );
};
