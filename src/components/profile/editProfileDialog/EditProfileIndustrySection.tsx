import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import {
  getSecondaryOptionsForPrimary,
  INDUSTRY_PRIMARY_OPTIONS,
} from '../../../constants/industryTaxonomy';
import {
  BORDER_COLOR,
  getSubIndustryPlaceholder,
  INPUT_BG,
  INPUT_HEIGHT,
  INPUT_STYLES,
  PURPLE_ACCENT,
} from './constants';
import { FORM_SECTION_HEADING_SX } from '../../../lib/ui/formSurface';
import {
  appendSubIndustrySelection,
  findMatchingSubIndustryOption,
} from './industryKeyboard';
import type { EditProfileFormData } from './types';

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
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [statusMessages, setStatusMessages] = useState<Record<number, string>>(
    {},
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              borderLeft: { sm: `2px solid ${BORDER_COLOR}` },
              py: 0.5,
            }}
          >
            <FormControl
              fullWidth
              disabled={busy}
              variant="filled"
              sx={{ ...INPUT_STYLES, mb: idx === 0 ? 0 : 0.75 }}
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
                    color: 'rgba(255,255,255,0.62)',
                    lineHeight: 1.45,
                  }}
                >
                  Used for Directory filtering.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.5)',
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
                    ...INPUT_STYLES,
                    '& .MuiFilledInput-root': {
                      ...INPUT_STYLES['& .MuiFilledInput-root'],
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
                    bgcolor: INPUT_BG,
                    border: `1px solid ${BORDER_COLOR}`,
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
              <FormHelperText sx={{ color: 'rgba(255,255,255,0.62)' }}>
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
    </Box>
  );
};
