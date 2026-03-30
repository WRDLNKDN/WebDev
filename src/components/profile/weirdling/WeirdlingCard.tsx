import EditIcon from '@mui/icons-material/Edit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { getGlassCard } from '../../../theme/candyStyles';
import { compactGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';
import type { Weirdling } from '../../../types/weirdling';

interface WeirdlingCardProps {
  weirdling: Weirdling | null;
  onCreate: () => void;
  onEdit: () => void;
  onDeleteRequest: (w: Weirdling) => void;
  loading?: boolean;
}

/**
 * Compact Weirdling card for sidebar — Create when empty, display + Edit/Delete when present.
 */
export const WeirdlingCard = ({
  weirdling,
  onCreate,
  onEdit,
  onDeleteRequest,
  loading = false,
}: WeirdlingCardProps) => {
  const theme = useTheme();
  if (loading) {
    return (
      <Paper elevation={0} sx={{ ...getGlassCard(theme), p: 3 }}>
        <Typography variant="overline" color="text.secondary">
          MY WEIRDLING
        </Typography>
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        ...getGlassCard(theme),
        p: 3,
        height: '100%',
        minHeight: 200,
      }}
    >
      <Typography
        variant="overline"
        sx={{
          letterSpacing: 2,
          color: 'text.secondary',
          fontWeight: 600,
        }}
      >
        MY WEIRDLING
      </Typography>

      {!weirdling ? (
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: 'center',
            border: '2px dashed rgba(141,188,229,0.38)',
            borderRadius: 2,
            mt: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a Weirdling to represent you.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={onCreate}
            sx={{ textTransform: 'none' }}
          >
            Create Weirdling
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            {weirdling.avatarUrl && (
              <Box
                component="img"
                src={weirdling.avatarUrl}
                alt={weirdling.displayName}
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 2,
                  objectFit: 'cover',
                  border: '2px solid rgba(156,187,217,0.30)',
                }}
              />
            )}
            <Tooltip title={`Delete ${weirdling.displayName}`}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onDeleteRequest(weirdling)}
                  aria-label={`Delete ${weirdling.displayName}`}
                  sx={{
                    ...compactGlassDangerIconButtonSx,
                    position: 'absolute',
                    top: 4,
                    right: 4,
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {weirdling.displayName}
          </Typography>
          {weirdling.tagline && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              &ldquo;{weirdling.tagline}&rdquo;
            </Typography>
          )}
          {weirdling.roleVibe && (
            <Typography variant="caption" color="primary.main">
              {weirdling.roleVibe}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={onEdit}
              sx={{
                borderColor: 'rgba(141,188,229,0.50)',
                color: 'white',
                textTransform: 'none',
              }}
            >
              Edit
            </Button>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
};
