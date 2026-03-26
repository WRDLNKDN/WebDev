import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Autocomplete,
  Box,
  Button,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useId, useState } from 'react';
import { denseMenuPaperSxFromTheme } from '../../../lib/ui/formSurface';
import {
  INTEREST_CUSTOM_OTHER_MAX_LENGTH,
  INTEREST_OPTIONS_FLAT,
  INTERESTS_MAX,
  type InterestCategory,
  type InterestOption,
} from '../../../constants/interestTaxonomy';

function getCategoryForLabel(label: string): InterestCategory {
  const found = INTEREST_OPTIONS_FLAT.find(
    (o: InterestOption) => o.label.toLowerCase() === label.toLowerCase(),
  );
  return found?.category ?? 'Other';
}

const TAXONOMY_LABELS = INTEREST_OPTIONS_FLAT.map(
  (o: InterestOption) => o.label,
);

export interface InterestsDropdownProps {
  /** Current selected interests (from nerd_creds.interests). */
  value: string[];
  /** Called when user saves; persist with nerd_creds.interests. */
  onSave: (interests: string[]) => Promise<void>;
  disabled?: boolean;
  /** Accessibility label for the trigger. */
  'aria-label'?: string;
}

export const InterestsDropdown = ({
  value,
  onSave,
  disabled = false,
  'aria-label': ariaLabelProp,
}: InterestsDropdownProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const triggerAriaLabel = ariaLabelProp ?? 'Interests';
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<string[]>(value);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const listboxId = useId();

  const openDropdown = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setAnchor(e.currentTarget);
    setSelected(value);
    setOpen(true);
  };

  const closeDropdown = () => {
    setAnchor(null);
    setOpen(false);
  };

  const handleSave = async () => {
    const toSave = selected.slice(0, INTERESTS_MAX);
    setSaving(true);
    try {
      await onSave(toSave);
      closeDropdown();
    } catch {
      // Caller may show toast
    } finally {
      setSaving(false);
    }
  };

  const atMax = selected.length >= INTERESTS_MAX;

  return (
    <>
      <Button
        id={triggerId}
        variant="outlined"
        size="small"
        onClick={openDropdown}
        disabled={disabled}
        endIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
        aria-label={triggerAriaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-testid="dashboard-interests-dropdown"
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          textTransform: 'none',
          fontSize: '0.8125rem',
          borderColor: 'rgba(156,187,217,0.4)',
          color: 'text.secondary',
          minHeight: { xs: 44, sm: 36 },
          py: { xs: 0.75, sm: 0.5 },
          '&:hover': {
            borderColor: 'rgba(156,187,217,0.6)',
            bgcolor: 'rgba(255,255,255,0.04)',
          },
        }}
      >
        Interests
      </Button>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={closeDropdown}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: Math.min(280, anchor?.offsetWidth ?? 280),
              maxWidth: 'min(calc(100vw - 24px), 400px)',
              maxHeight: 'min(360px, 70vh)',
              borderRadius: 2,
              ...denseMenuPaperSxFromTheme(theme),
            },
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              letterSpacing: 1.2,
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.7rem',
              mb: 1,
            }}
          >
            Add or remove interests
          </Typography>
          <Tooltip
            title={
              atMax
                ? 'Maximum interests reached. Remove one from your list to add another.'
                : ''
            }
            disableHoverListener={!atMax}
            enterTouchDelay={0}
          >
            <Box>
              <Autocomplete
                id={listboxId}
                multiple
                freeSolo
                size="small"
                disabled={saving}
                openOnFocus
                options={TAXONOMY_LABELS}
                value={selected}
                onChange={(_, next) => {
                  setSelected(next.slice(0, INTERESTS_MAX));
                }}
                groupBy={(option) => getCategoryForLabel(option)}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option
                }
                getOptionDisabled={(option) =>
                  atMax &&
                  !selected.some(
                    (s) => s.toLowerCase() === String(option).toLowerCase(),
                  )
                }
                filterOptions={(options, state) => {
                  const raw = (state.inputValue?.trim() ?? '').slice(
                    0,
                    INTEREST_CUSTOM_OTHER_MAX_LENGTH,
                  );
                  const inputLower = raw.toLowerCase();
                  if (!inputLower) return options;
                  const filtered = options.filter((opt) =>
                    opt.toLowerCase().includes(inputLower),
                  );
                  const customNotInList =
                    raw &&
                    !TAXONOMY_LABELS.some(
                      (l: string) => l.toLowerCase() === inputLower,
                    ) &&
                    !selected.some((s) => s.toLowerCase() === inputLower);
                  if (customNotInList && selected.length < INTERESTS_MAX) {
                    return [...filtered, raw];
                  }
                  return filtered;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={
                      atMax
                        ? 'Remove an interest to add another'
                        : 'Search or type custom…'
                    }
                    inputProps={{
                      ...params.inputProps,
                      'aria-label': 'Search or add interest',
                      maxLength: INTEREST_CUSTOM_OTHER_MAX_LENGTH,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: isLight
                          ? alpha(theme.palette.common.black, 0.04)
                          : 'rgba(255,255,255,0.06)',
                        borderRadius: 1,
                        '& fieldset': {
                          borderColor: isLight
                            ? theme.palette.divider
                            : 'rgba(156,187,217,0.3)',
                        },
                      },
                    }}
                  />
                )}
                slotProps={{
                  paper: {
                    sx: denseMenuPaperSxFromTheme(theme),
                  },
                }}
                sx={{
                  mb: 1.5,
                  '& .MuiAutocomplete-tag': { my: '2px' },
                }}
              />
            </Box>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            fullWidth
            disabled={saving}
            onClick={() => void handleSave()}
            aria-label="Save interests"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: 'primary.main',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Popover>
    </>
  );
};
