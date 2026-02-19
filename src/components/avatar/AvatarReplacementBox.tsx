/**
 * Avatar Replacement Box — preset grid + AI Weirdling CTA.
 * Any selection replaces current avatar (photo or AI Weirdling).
 */
import PsychologyIcon from '@mui/icons-material/Psychology';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AVATAR_PRESETS, type AvatarPreset } from '../../config/avatarPresets';

const BORDER_COLOR = 'rgba(255,255,255,0.08)';
const PURPLE_ACCENT = '#B366FF';

export interface AvatarReplacementBoxProps {
  /** Current active avatar URL (to detect if we need confirm modal). */
  currentAvatarUrl: string | null;
  /** Currently selected preset image_url, if any. */
  selectedPresetUrl: string | null;
  /** Called when user confirms preset selection. */
  onSelectPreset: (preset: AvatarPreset) => void;
  disabled?: boolean;
}

export const AvatarReplacementBox = ({
  currentAvatarUrl,
  selectedPresetUrl,
  onSelectPreset,
  disabled = false,
}: AvatarReplacementBoxProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<AvatarPreset | null>(null);

  const presetUrls = AVATAR_PRESETS.map((p) => p.image_url);
  const hasExistingAvatar = !!(
    currentAvatarUrl &&
    currentAvatarUrl.trim() !== '' &&
    !presetUrls.includes(currentAvatarUrl)
  );
  const isPresetActive = (url: string) =>
    selectedPresetUrl === url || currentAvatarUrl === url;

  const handlePresetClick = (preset: AvatarPreset) => {
    if (disabled) return;
    if (hasExistingAvatar && !confirmOpen) {
      setPendingPreset(preset);
      setConfirmOpen(true);
    } else {
      applyPreset(preset);
    }
  };

  const applyPreset = (preset: AvatarPreset) => {
    onSelectPreset(preset);
    setPendingPreset(null);
    setConfirmOpen(false);
  };

  const handleConfirm = () => {
    if (pendingPreset) {
      applyPreset(pendingPreset);
    }
  };

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.2)',
        border: `1px solid ${BORDER_COLOR}`,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255,255,255,0.85)',
          mb: 2,
          display: 'block',
        }}
      >
        Any selection here will replace your current avatar.
      </Typography>

      {/* AI Weirdling CTA */}
      <Button
        component={RouterLink}
        to="/weirdling/create"
        variant="outlined"
        size="small"
        startIcon={<PsychologyIcon />}
        disabled={disabled}
        sx={{
          mb: 2,
          borderColor: PURPLE_ACCENT,
          color: PURPLE_ACCENT,
          textTransform: 'none',
          '&:hover': {
            borderColor: `${PURPLE_ACCENT}dd`,
            color: `${PURPLE_ACCENT}dd`,
            bgcolor: 'rgba(179,102,255,0.08)',
          },
        }}
      >
        Create your own AI Weirdling
      </Button>

      {/* Preset grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(3, 1fr)',
            sm: 'repeat(6, 1fr)',
          },
          gap: 1.5,
        }}
      >
        {AVATAR_PRESETS.map((preset) => {
          const selected = isPresetActive(preset.image_url);
          return (
            <Box
              key={preset.preset_id}
              component="button"
              type="button"
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              aria-label={`Select ${preset.name}`}
              sx={{
                p: 0,
                border: 2,
                borderColor: selected ? PURPLE_ACCENT : BORDER_COLOR,
                borderRadius: 2,
                overflow: 'hidden',
                cursor: disabled ? 'default' : 'pointer',
                bgcolor: 'transparent',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': disabled
                  ? {}
                  : {
                      borderColor: selected
                        ? PURPLE_ACCENT
                        : 'rgba(255,255,255,0.2)',
                      boxShadow: selected
                        ? '0 0 12px rgba(179,102,255,0.3)'
                        : '0 0 8px rgba(0,0,0,0.3)',
                    },
                aspectRatio: '1',
              }}
            >
              <Box
                component="img"
                src={preset.image_url}
                alt={preset.name}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  display: 'block',
                }}
              />
            </Box>
          );
        })}
      </Box>

      {/* Confirm modal */}
      <Dialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingPreset(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1f',
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>Replace your avatar?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>
            This will replace your current avatar. Continue?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              setPendingPreset(null);
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirm}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
