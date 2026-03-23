import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useCallback, useState } from 'react';
import {
  getSecondaryOptionsForPrimary,
  INDUSTRY_PRIMARY_OPTIONS,
} from '../../../constants/industryTaxonomy';
import {
  BORDER_COLOR,
  getInputStyles,
  getSubIndustryPlaceholder,
  INPUT_BG,
  INPUT_HEIGHT,
  PURPLE_ACCENT,
} from './constants';
import { FORM_SECTION_HEADING_SX } from '../../../lib/ui/formSurface';
import {
  appendSubIndustrySelection,
  findMatchingSubIndustryOption,
} from './industryKeyboard';
import {
  parseNicheValues,
  serializeNicheValues,
} from '../../../lib/profile/nicheValues';
import type { EditProfileFormData } from './types';

/** Message for clear-all confirmation on multi-select fields (Industries and others). */
export const CLEAR_ALL_ENTRIES_CONFIRM_MESSAGE =
  'Warning - you are about to remove all entries. Continue?';

const OtherIndustryChip = ({
  value,
  busy,
  onRemove,
}: {
  value: string;
  busy: boolean;
  onRemove: (v: string) => void;
}) => {
  return (
    <Chip
      label={value}
      size="small"
      disabled={busy}
      onDelete={busy ? undefined : () => onRemove(value)}
    />
  );
};

type ClearConfirmTarget =
  | { type: 'sub-industries'; idx: number }
  | { type: 'other' }
  | null;

type Props = {
  busy: boolean;
  formData: EditProfileFormData;
  onChange: (
    updater: (prev: EditProfileFormData) => EditProfileFormData,
  ) => void;
};

export const EditProfileIndustrySection = ({
  busy,
  formData,
  onChange,
}: Props) => {
  const otherValues = parseNicheValues(formData.niche_field);
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [statusMessages, setStatusMessages] = useState<Record<number, string>>(
    {},
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [otherInputValue, setOtherInputValue] = useState('');
  const [clearConfirmTarget, setClearConfirmTarget] =
    useState<ClearConfirmTarget>(null);

  const theme = useTheme();
  const inputStyles = getInputStyles(theme);
  const isLight = theme.palette.mode === 'light';

  const removeOtherIndustryLabel = useCallback(
    (entry: string) => {
      onChange((prev) => ({
        ...prev,
        niche_field: serializeNicheValues(
          otherValues.filter((v) => v !== entry),
        ),
      }));
    },
    [onChange, otherValues],
  );

  const setInputValue = (idx: number, value: string) => {
    setStatusMessages((prev) => ({ ...prev, [idx]: '' }));
    setInputValues((prev) => ({ ...prev, [idx]: value }));
  };

  const clearInputValue = (idx: number) => {
    setInputValues((prev) => ({ ...prev, [idx]: '' }));
  };

  const commitSubIndustry = (idx: number) => {
    const group = formData.industries[idx];
    if (!group?.industry) return false;
    const nextValue = findMatchingSubIndustryOption(
      inputValues[idx] ?? '',
      getSecondaryOptionsForPrimary(group.industry),
      group.sub_industries,
    );
    if (!nextValue) return false;

    onChange((prev) => ({
      ...prev,
      industries: prev.industries.map((item, i) =>
        i === idx
          ? {
              ...item,
              sub_industries: appendSubIndustrySelection(
                item.sub_industries,
                nextValue,
              ),
            }
          : item,
      ),
    }));
    setStatusMessages((prev) => ({
      ...prev,
      [idx]: `Added ${nextValue}. Press Escape when you are done.`,
    }));
    clearInputValue(idx);
    setOpenIndex(idx);
    return true;
  };

  const commitOtherValue = () => {
    const parsedFromInput = parseNicheValues(otherInputValue);
    if (parsedFromInput.length === 0) return false;

    const nextValues = parseNicheValues(
      serializeNicheValues([...otherValues, ...parsedFromInput]),
    );
    onChange((prev) => ({
      ...prev,
      niche_field: serializeNicheValues(nextValues),
    }));
    setOtherInputValue('');
    return true;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="caption"
        sx={{
          ...FORM_SECTION_HEADING_SX,
          display: 'block',
          mb: 0.75,
          lineHeight: 1.2,
        }}
      >
        Industry Coverage
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Choose the primary industries and sub-industries members can use to
        discover you.
      </Typography>
      <Stack spacing={2.25}>
        {formData.industries.map((group, idx) => (
          <Box
            key={idx}
            sx={{
              pl: { xs: 0, sm: 1 },
              borderLeft: {
                sm: `2px solid ${isLight ? theme.palette.divider : BORDER_COLOR}`,
              },
              py: 0.5,
            }}
          >
            <FormControl
              fullWidth
              disabled={busy}
              variant="filled"
              sx={{ ...inputStyles, mb: idx === 0 ? 0 : 0.75 }}
            >
              <Select
                value={group.industry}
                onChange={(event) => {
                  const next = event.target.value;
                  clearInputValue(idx);
                  setStatusMessages((prev) => ({ ...prev, [idx]: '' }));
                  setOpenIndex(null);
                  onChange((prev) => ({
                    ...prev,
                    industries: prev.industries.map((item, i) =>
                      i === idx ? { industry: next, sub_industries: [] } : item,
                    ),
                  }));
                }}
                displayEmpty
                renderValue={(value) => value || 'Select industry'}
                inputProps={{ 'aria-label': 'Industry' }}
                sx={{
                  '& .MuiSelect-select': {
                    py: '8px !important',
                    lineHeight: 1.35,
                  },
                  '& .MuiSelect-icon': {
                    color: isLight
                      ? theme.palette.text.secondary
                      : 'rgba(255,255,255,0.6)',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: isLight
                        ? theme.palette.background.paper
                        : INPUT_BG,
                      color: theme.palette.text.primary,
                      border: `1px solid ${isLight ? theme.palette.divider : BORDER_COLOR}`,
                    },
                  },
                }}
              >
                <MenuItem value="">Select industry</MenuItem>
                {INDUSTRY_PRIMARY_OPTIONS.filter(
                  (opt) =>
                    opt === group.industry ||
                    !formData.industries.some(
                      (g, i) => i !== idx && g.industry === opt,
                    ),
                ).map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {idx === 0 ? (
              <Stack spacing={0.6} sx={{ mt: 0.75, mb: 1.25, px: 0.25 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: 'text.secondary',
                    lineHeight: 1.45,
                  }}
                >
                  Used for Directory filtering.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: 'text.secondary',
                    lineHeight: 1.45,
                  }}
                >
                  Add up to 5 industries. Each can have up to 8 sub-industries.
                </Typography>
              </Stack>
            ) : null}

            <Autocomplete
              multiple
              autoHighlight
              clearOnBlur
              selectOnFocus
              disabled={busy || !group.industry}
              open={openIndex === idx}
              onOpen={() => {
                if (!busy && group.industry) setOpenIndex(idx);
              }}
              onClose={(_, reason) => {
                if (
                  reason === 'blur' ||
                  reason === 'escape' ||
                  reason === 'selectOption'
                ) {
                  setOpenIndex(null);
                  return;
                }
                setOpenIndex((current) => (current === idx ? null : current));
              }}
              options={getSecondaryOptionsForPrimary(group.industry)}
              inputValue={inputValues[idx] ?? ''}
              onInputChange={(_, next, reason) => {
                if (reason === 'reset') {
                  clearInputValue(idx);
                  return;
                }
                setInputValue(idx, next);
              }}
              value={group.sub_industries}
              onChange={(_, next) => {
                clearInputValue(idx);
                setStatusMessages((prev) => ({ ...prev, [idx]: '' }));
                onChange((prev) => ({
                  ...prev,
                  industries: prev.industries.map((item, i) =>
                    i === idx
                      ? { ...item, sub_industries: next.slice(0, 8) }
                      : item,
                  ),
                }));
              }}
              getOptionLabel={(option) => option}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="filled"
                  inputProps={{
                    ...params.inputProps,
                    placeholder: getSubIndustryPlaceholder(
                      Boolean(group.industry),
                      group.sub_industries.length,
                    ),
                    'aria-label': 'Sub-Industry',
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      const committed = commitSubIndustry(idx);
                      if (committed) {
                        event.preventDefault();
                        event.stopPropagation();
                        const input =
                          event.currentTarget.querySelector('input');
                        requestAnimationFrame(() => input?.focus());
                      }
                      return;
                    }
                    if (event.key === 'Escape' && openIndex === idx) {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenIndex(null);
                    }
                  }}
                  sx={{
                    ...inputStyles,
                    '& .MuiFilledInput-root': {
                      minHeight: INPUT_HEIGHT,
                      alignItems: 'center',
                    },
                    '& .MuiAutocomplete-input': { lineHeight: 1.4 },
                    '& .MuiAutocomplete-tag': { my: '2px' },
                  }}
                />
              )}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: isLight
                      ? theme.palette.background.paper
                      : INPUT_BG,
                    border: `1px solid ${isLight ? theme.palette.divider : BORDER_COLOR}`,
                  },
                },
                clearIndicator: {
                  onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (group.sub_industries.length > 0) {
                      setClearConfirmTarget({ type: 'sub-industries', idx });
                    }
                  },
                },
              }}
              sx={{ mb: 0.5 }}
            />

            {group.sub_industries.length > 8 ? (
              <FormHelperText error>
                Max 8 sub-industries. Remove {group.sub_industries.length - 8}{' '}
                to save.
              </FormHelperText>
            ) : statusMessages[idx] ? (
              <FormHelperText sx={{ color: 'text.secondary' }}>
                {statusMessages[idx]}
              </FormHelperText>
            ) : null}

            {formData.industries.length > 1 ? (
              <Button
                size="small"
                onClick={() => {
                  clearInputValue(idx);
                  setStatusMessages((prev) => ({ ...prev, [idx]: '' }));
                  setOpenIndex((current) => (current === idx ? null : current));
                  onChange((prev) => ({
                    ...prev,
                    industries: prev.industries.filter((_, i) => i !== idx),
                  }));
                }}
                sx={{ mt: 0.5, color: 'text.secondary' }}
              >
                Remove this industry
              </Button>
            ) : null}
          </Box>
        ))}
      </Stack>

      {formData.industries.length < 5 ? (
        <Button
          size="small"
          onClick={() => {
            onChange((prev) => ({
              ...prev,
              industries: [
                ...prev.industries,
                { industry: '', sub_industries: [] },
              ],
            }));
          }}
          sx={{ mt: 1, color: PURPLE_ACCENT, textTransform: 'none' }}
        >
          Add Another Industry
        </Button>
      ) : (
        <FormHelperText sx={{ mt: 0.5 }}>
          Maximum 5 industries. Remove one to add another.
        </FormHelperText>
      )}

      <Box sx={{ mt: 2.25 }}>
        <Typography
          variant="caption"
          sx={{
            ...FORM_SECTION_HEADING_SX,
            display: 'block',
            mb: 0.75,
          }}
        >
          Other
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Add niche or cross-industry labels. Type and press Enter, or paste
          comma-separated values.
        </Typography>
        {otherValues.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.25 }}>
            {otherValues.map((value) => (
              <OtherIndustryChip
                key={value}
                value={value}
                busy={busy}
                onRemove={removeOtherIndustryLabel}
              />
            ))}
          </Stack>
        ) : null}
        {otherValues.length > 0 && !busy ? (
          <Button
            size="small"
            onClick={() => setClearConfirmTarget({ type: 'other' })}
            sx={{ mb: 1, textTransform: 'none', color: 'text.secondary' }}
          >
            Clear all other labels
          </Button>
        ) : null}
        <TextField
          fullWidth
          variant="filled"
          disabled={busy}
          value={otherInputValue}
          onChange={(e) => setOtherInputValue(e.target.value)}
          placeholder="e.g. FinTech, DevSecOps"
          helperText="Enter adds typed text; commas split multiple entries."
          aria-label="Other industries"
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' ||
              event.key === ',' ||
              event.key === 'Tab'
            ) {
              const committed = commitOtherValue();
              if (committed) {
                event.preventDefault();
                event.stopPropagation();
              }
            }
          }}
          sx={{
            ...inputStyles,
            '& .MuiFilledInput-root': {
              minHeight: INPUT_HEIGHT,
              alignItems: 'center',
            },
          }}
        />
      </Box>

      <Dialog
        open={clearConfirmTarget !== null}
        onClose={() => setClearConfirmTarget(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="clear-all-entries-title"
        aria-describedby="clear-all-entries-description"
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle id="clear-all-entries-title">Warning</DialogTitle>
        <DialogContent>
          <Typography id="clear-all-entries-description" variant="body2">
            {CLEAR_ALL_ENTRIES_CONFIRM_MESSAGE}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setClearConfirmTarget(null)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (clearConfirmTarget === null) return;
              if (clearConfirmTarget.type === 'sub-industries') {
                const idx = clearConfirmTarget.idx;
                clearInputValue(idx);
                setStatusMessages((prev) => ({ ...prev, [idx]: '' }));
                setOpenIndex((current) => (current === idx ? null : current));
                onChange((prev) => ({
                  ...prev,
                  industries: prev.industries.map((item, i) =>
                    i === idx ? { ...item, sub_industries: [] } : item,
                  ),
                }));
              } else {
                setOtherInputValue('');
                onChange((prev) => ({
                  ...prev,
                  niche_field: '',
                }));
              }
              setClearConfirmTarget(null);
            }}
            sx={{ textTransform: 'none' }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
