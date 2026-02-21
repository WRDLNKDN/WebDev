/**
 * Avatar Replacement Box — preset-only Weirdling picker.
 * Any selection replaces current avatar (photo or AI Weirdling).
 */
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';
import { useState } from 'react';
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
        {AVATAR_PRESETS.map((preset, index) => {
          const selected = isPresetActive(preset.image_url);
          return (
            <Box
              key={preset.preset_id}
              component="button"
              type="button"
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              aria-label={`Select Weirdling ${index + 1}`}
              sx={{
                p: 0,
                border: 2,
                borderColor: selected ? PURPLE_ACCENT : BORDER_COLOR,
                borderRadius: 2,
                overflow: 'hidden',
                cursor: disabled ? 'default' : 'pointer',
                bgcolor: 'transparent',
                position: 'relative',
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
                aria-hidden
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(135deg, rgba(0,196,204,0.28) 0%, rgba(255,34,201,0.25) 100%)',
                  color: 'rgba(255,255,255,0.82)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                {index + 1}
              </Box>
              <Box
                component="img"
                src={preset.image_url}
                alt=""
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
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
