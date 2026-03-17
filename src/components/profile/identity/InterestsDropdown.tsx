import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Autocomplete,
  Box,
  Button,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import React, { useId, useState } from 'react';
import {
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
  'aria-label': ariaLabel = 'Interests',
}: InterestsDropdownProps) => {
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
        aria-label={ariaLabel}
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
          minHeight: 36,
          '&:hover': {
            borderColor: 'rgba(156,187,217,0.6)',
            bgcolor: 'rgba(255,255,255,0.04)',
          },
        }}
      >
        {value.length === 0 ? 'Interests' : `Interests (${value.length})`}
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
              minWidth: Math.min(320, anchor?.offsetWidth ?? 320),
              maxWidth: 400,
              maxHeight: 360,
              bgcolor: 'rgba(30,30,30,0.98)',
              border: '1px solid rgba(156,187,217,0.26)',
              borderRadius: 2,
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
            Add or remove interests (max {INTERESTS_MAX})
          </Typography>
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
            filterOptions={(options, state) => {
              const raw = state.inputValue?.trim() ?? '';
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
                placeholder={atMax ? 'Max reached' : 'Search or type custom…'}
                inputProps={{
                  ...params.inputProps,
                  'aria-label': 'Search or add interest',
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.06)',
                    borderRadius: 1,
                    '& fieldset': {
                      borderColor: 'rgba(156,187,217,0.3)',
                    },
                  },
                }}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: 'rgba(30,30,30,0.98)',
                  border: '1px solid rgba(156,187,217,0.26)',
                },
              },
            }}
            sx={{
              mb: 1.5,
              '& .MuiAutocomplete-tag': { my: '2px' },
            }}
          />
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
