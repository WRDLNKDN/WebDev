import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import {
  INTEREST_CATEGORIES,
  INTEREST_CUSTOM_OTHER_MAX_LENGTH,
  INTEREST_OPTIONS_BY_CATEGORY,
  INTERESTS_MAX,
} from '../../../constants/interestTaxonomy';
import {
  getProfanityOverrides,
  getProfanityAllowlist,
  validateProfanity,
  PROFANITY_ERROR_MESSAGE_INTEREST,
} from '../../../lib/validation/profanity';
import {
  FORM_OUTLINED_FIELD_SX,
  FORM_SECTION_HEADING_SX,
} from '../../../lib/ui/formSurface';

export interface JoinInterestsSelectorProps {
  value: string[];
  onChange: (interests: string[]) => void;
  disabled?: boolean;
  error?: string;
  /** Called when custom "Other" fails validation (profanity or length). */
  onValidationError?: (message: string) => void;
}

const toggleSelected = (current: string[], item: string): string[] => {
  if (current.includes(item)) return current.filter((x) => x !== item);
  if (current.length >= INTERESTS_MAX) return current;
  return [...current, item];
};

export const JoinInterestsSelector = ({
  value,
  onChange,
  disabled = false,
  error,
  onValidationError,
}: JoinInterestsSelectorProps) => {
  const [customOtherInput, setCustomOtherInput] = useState('');

  const atMax = value.length >= INTERESTS_MAX;
  const selectedSet = new Set(value.map((s) => s.toLowerCase()));

  const handleTaxonomySelect = (label: string) => {
    if (disabled) return;
    onChange(toggleSelected(value, label));
  };

  const handleAddCustom = async () => {
    const raw = customOtherInput.trim();
    if (!raw) return;
    if (raw.length > INTEREST_CUSTOM_OTHER_MAX_LENGTH) {
      onValidationError?.(
        `Custom interest must be ${INTEREST_CUSTOM_OTHER_MAX_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (value.length >= INTERESTS_MAX) return;
    if (selectedSet.has(raw.toLowerCase())) {
      setCustomOtherInput('');
      return;
    }
    try {
      const [blocklist, allowlist] = await Promise.all([
        getProfanityOverrides(),
        getProfanityAllowlist(),
      ]);
      validateProfanity(
        raw,
        blocklist,
        allowlist,
        PROFANITY_ERROR_MESSAGE_INTEREST,
      );
    } catch (e) {
      onValidationError?.(
        e instanceof Error ? e.message : 'That term is not allowed.',
      );
      return;
    }
    onChange([...value, raw].slice(0, INTERESTS_MAX));
    setCustomOtherInput('');
    onValidationError?.('');
  };

  return (
    <Box sx={{ width: '100%' }} data-testid="join-interests-selector">
      <Typography
        variant="caption"
        sx={{ ...FORM_SECTION_HEADING_SX, display: 'block', mb: 0.75 }}
      >
        Interests
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Select up to {INTERESTS_MAX} interests. Optional.
      </Typography>

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <Stack spacing={2}>
        {INTEREST_CATEGORIES.map((category) => {
          const options = INTEREST_OPTIONS_BY_CATEGORY[category];
          const isOther = category === 'Other';
          return (
            <Box key={category}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'text.secondary',
                  mb: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                {category}
              </Typography>
              {!isOther ? (
                <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                  {options.map((label) => {
                    const selected = value.includes(label);
                    return (
                      <Chip
                        key={label}
                        label={label}
                        size="small"
                        onClick={() => handleTaxonomySelect(label)}
                        disabled={disabled || (!selected && atMax)}
                        color={selected ? 'primary' : 'default'}
                        variant={selected ? 'filled' : 'outlined'}
                        sx={{
                          '&.MuiChip-outlined': {
                            borderColor: 'rgba(255,255,255,0.35)',
                            color: 'rgba(255,255,255,0.9)',
                          },
                        }}
                        aria-pressed={selected}
                        aria-label={
                          selected ? `Remove ${label}` : `Add ${label}`
                        }
                      />
                    );
                  })}
                </Stack>
              ) : (
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  alignItems="center"
                >
                  <TextField
                    size="small"
                    placeholder="Type a custom interest…"
                    value={customOtherInput}
                    onChange={(e) =>
                      setCustomOtherInput(
                        e.target.value.slice(
                          0,
                          INTEREST_CUSTOM_OTHER_MAX_LENGTH,
                        ),
                      )
                    }
                    disabled={disabled || atMax}
                    inputProps={{
                      'aria-label': 'Custom interest',
                      maxLength: INTEREST_CUSTOM_OTHER_MAX_LENGTH,
                      'data-testid': 'join-interests-custom-other-input',
                    }}
                    helperText={`${customOtherInput.length}/${INTEREST_CUSTOM_OTHER_MAX_LENGTH}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddCustom();
                      }
                    }}
                    sx={{
                      ...FORM_OUTLINED_FIELD_SX,
                      flex: '1 1 200px',
                      minWidth: 0,
                    }}
                  />
                  <Chip
                    label="Add"
                    size="small"
                    onClick={() => void handleAddCustom()}
                    disabled={disabled || atMax || !customOtherInput.trim()}
                    color="primary"
                    variant="outlined"
                    sx={{ flexShrink: 0 }}
                    aria-label="Add custom interest"
                    data-testid="join-interests-add-custom"
                  />
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>

      {value.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Selected ({value.length}/{INTERESTS_MAX}): {value.join(', ')}
        </Typography>
      )}
    </Box>
  );
};
