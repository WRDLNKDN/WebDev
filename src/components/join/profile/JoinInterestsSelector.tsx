import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import { useMemo, useState } from 'react';
import {
  INTEREST_CATEGORIES,
  INTEREST_CUSTOM_OTHER_MAX_LENGTH,
  INTEREST_OPTIONS_BY_CATEGORY,
  INTEREST_OPTIONS_FLAT,
  INTERESTS_MAX,
  JOIN_SUGGESTED_INTEREST_LABELS,
  type InterestCategory,
} from '../../../constants/interestTaxonomy';
import {
  getProfanityOverrides,
  getProfanityAllowlist,
  validateProfanity,
  PROFANITY_ERROR_MESSAGE_INTEREST,
} from '../../../lib/validation/profanity';
import {
  FORM_SECTION_HEADING_SX,
  outlinedFieldSxFromTheme,
} from '../../../lib/ui/formSurface';
import {
  joinFlowInterestPillIdleSx,
  joinFlowInterestPillSelectedSx,
  joinFlowPrimaryButtonSx,
} from '../../../theme/joinStyles';
import { BRAND_COLORS } from '../../../theme/themeConstants';

export interface JoinInterestsSelectorProps {
  value: string[];
  onChange: (interests: string[]) => void;
  disabled?: boolean;
  error?: string;
  showDescription?: boolean;
  /** Called when custom "Other" fails validation (profanity or length). */
  onValidationError?: (message: string) => void;
}

const toggleSelected = (current: string[], item: string): string[] => {
  if (current.includes(item)) return current.filter((x) => x !== item);
  if (current.length >= INTERESTS_MAX) return current;
  return [...current, item];
};

function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * `data-testid` for category blocks inside the browse dialog (E2E / legacy name).
 * Main profile UI no longer uses accordions; categories live only in this dialog.
 */
export function joinInterestCategoryAccordionTestId(category: string): string {
  return `join-interests-dialog-section-${categorySlug(category)}`;
}

function filterOptions(
  options: readonly string[],
  q: string,
): readonly string[] {
  if (!q) return options;
  return options.filter((opt) => opt.toLowerCase().includes(q));
}

function filterCategoriesForBrowse(q: string): readonly InterestCategory[] {
  if (!q) return INTEREST_CATEGORIES;
  return INTEREST_CATEGORIES.filter((cat) => {
    if (cat.toLowerCase().includes(q)) return true;
    if (cat === 'Other') {
      return 'other'.includes(q) || 'custom'.includes(q);
    }
    return INTEREST_OPTIONS_BY_CATEGORY[cat].some((opt) =>
      opt.toLowerCase().includes(q),
    );
  });
}

const DIALOG_SCROLLBAR_HIDE_SX = {
  scrollbarWidth: 'none' as const,
  msOverflowStyle: 'none' as const,
  '&::-webkit-scrollbar': { display: 'none' },
};

const SEARCH_MATCH_LIMIT = 48;

export const JoinInterestsSelector = ({
  value,
  onChange,
  disabled = false,
  error,
  showDescription = true,
  onValidationError,
}: JoinInterestsSelectorProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const outlinedFieldSx = outlinedFieldSxFromTheme(theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [dialogOtherInput, setDialogOtherInput] = useState('');

  const atMax = value.length >= INTERESTS_MAX;
  const selectedSet = useMemo(
    () => new Set(value.map((s) => s.toLowerCase())),
    [value],
  );
  const qInline = searchQuery.trim().toLowerCase();
  const qBrowse = browseSearch.trim().toLowerCase();

  const sortedTaxonomyLabels = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const o of INTEREST_OPTIONS_FLAT) {
      if (!seen.has(o.label)) {
        seen.add(o.label);
        labels.push(o.label);
      }
    }
    return labels.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, []);

  const searchMatches = useMemo(() => {
    if (!qInline) return [];
    const matched = sortedTaxonomyLabels.filter((label) =>
      label.toLowerCase().includes(qInline),
    );
    return matched.slice(0, SEARCH_MATCH_LIMIT);
  }, [qInline, sortedTaxonomyLabels]);

  const handleTaxonomySelect = (label: string) => {
    if (disabled) return;
    onChange(toggleSelected(value, label));
  };

  const removeInterest = (label: string) => {
    if (disabled) return;
    onChange(value.filter((x) => x !== label));
  };

  const handleAddCustom = async (rawInput: string, clear: () => void) => {
    const raw = rawInput.trim();
    if (!raw) return;
    if (raw.length > INTEREST_CUSTOM_OTHER_MAX_LENGTH) {
      onValidationError?.(
        `Custom interest must be ${INTEREST_CUSTOM_OTHER_MAX_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (value.length >= INTERESTS_MAX) return;
    if (selectedSet.has(raw.toLowerCase())) {
      clear();
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
    clear();
    onValidationError?.('');
  };

  const browseCategories = useMemo(
    () => filterCategoriesForBrowse(qBrowse),
    [qBrowse],
  );

  const handleBrowseClose = () => {
    setBrowseOpen(false);
    setBrowseSearch('');
    setDialogOtherInput('');
  };

  const sectionLabelSx = {
    display: 'block',
    mb: { xs: 0.35, sm: 0.5 },
    fontWeight: 600,
    letterSpacing: '0.04em',
    fontSize: '0.6875rem',
    color: isLight ? 'text.secondary' : 'rgba(255,255,255,0.62)',
  } as const;

  const renderInterestPill = (label: string) => {
    const selected = value.includes(label);
    const blockedByMax = !selected && atMax && !disabled;
    return (
      <Tooltip
        key={label}
        title={
          blockedByMax
            ? 'Maximum interests reached. Remove one to add another.'
            : ''
        }
        disableHoverListener={!blockedByMax}
        enterTouchDelay={0}
      >
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <Button
            type="button"
            size="small"
            variant={selected ? 'contained' : 'outlined'}
            disableElevation
            disabled={disabled || (!selected && atMax)}
            onClick={() => handleTaxonomySelect(label)}
            sx={{
              ...(selected
                ? joinFlowInterestPillSelectedSx
                : joinFlowInterestPillIdleSx),
              '&.Mui-disabled': {
                opacity: 0.4,
              },
            }}
            aria-pressed={selected}
            aria-label={selected ? `Remove ${label}` : `Add ${label}`}
          >
            {label}
          </Button>
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ width: '100%' }} data-testid="join-interests-selector">
      <Typography
        variant="caption"
        sx={{
          ...FORM_SECTION_HEADING_SX,
          display: 'block',
          mb: { xs: 0.2, sm: 0.35 },
        }}
      >
        Interests
      </Typography>
      {showDescription ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: { xs: 0.45, sm: 0.75 },
            fontSize: { xs: '0.78rem', sm: '0.8125rem' },
            lineHeight: 1.4,
          }}
        >
          How do you want to show up? Search or tap a suggestion — up to{' '}
          {INTERESTS_MAX}, all optional.
        </Typography>
      ) : null}

      {error && (
        <Typography
          variant="body2"
          color="error"
          sx={{ mb: { xs: 0.5, sm: 1 } }}
        >
          {error}
        </Typography>
      )}

      <TextField
        size="small"
        fullWidth
        placeholder="Search interests…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        disabled={disabled}
        inputProps={{
          'aria-label': 'Search interests',
          'data-testid': 'join-interests-search',
        }}
        sx={{
          ...outlinedFieldSx,
          mb: { xs: 0.55, sm: 0.85 },
          '& .MuiOutlinedInput-root': { fontSize: '0.875rem' },
        }}
      />

      {qInline ? (
        <Box sx={{ mb: { xs: 0.75, sm: 1 } }}>
          <Typography variant="caption" sx={sectionLabelSx}>
            {searchMatches.length > 0 ? 'Matching interests' : 'No matches'}
          </Typography>
          {searchMatches.length > 0 ? (
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={0.75}
              useFlexGap
              sx={{ mt: 0.5 }}
            >
              {searchMatches.map((label) => renderInterestPill(label))}
            </Stack>
          ) : (
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.8125rem',
              }}
            >
              Try another word, pick a suggestion below, or browse all
              interests.
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ mb: { xs: 0.75, sm: 1.1 } }}>
          <Typography variant="caption" sx={sectionLabelSx}>
            Suggestions
          </Typography>
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={0.75}
            useFlexGap
            sx={{ mt: 0.5 }}
          >
            {JOIN_SUGGESTED_INTEREST_LABELS.map((label) =>
              renderInterestPill(label),
            )}
          </Stack>
        </Box>
      )}

      <Typography
        variant="caption"
        sx={{ ...sectionLabelSx, mb: { xs: 0.25, sm: 0.35 } }}
      >
        Your interests ({value.length}/{INTERESTS_MAX})
      </Typography>
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={0.75}
        useFlexGap
        data-testid="join-interests-selected"
        sx={{
          mb: { xs: 0.65, sm: 0.85 },
          minHeight: value.length ? 'auto' : 0,
        }}
      >
        {value.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.8125rem' }}
          >
            Nothing here yet — add from search or suggestions.
          </Typography>
        ) : (
          value.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              onDelete={disabled ? undefined : () => removeInterest(label)}
              disabled={disabled}
              deleteIcon={
                <CancelIcon fontSize="small" aria-label={`Remove ${label}`} />
              }
              sx={{
                height: 34,
                fontSize: '0.8125rem',
                fontWeight: 600,
                bgcolor: BRAND_COLORS.purple,
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(167,68,194,0.35)',
                '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.85)' },
              }}
            />
          ))
        )}
      </Stack>

      <Button
        type="button"
        variant="contained"
        disableElevation
        fullWidth
        disabled={disabled}
        onClick={() => setBrowseOpen(true)}
        data-testid="join-interests-browse-all"
        sx={{
          ...joinFlowPrimaryButtonSx,
          mt: { xs: 0.15, sm: 0.35 },
        }}
      >
        Browse all interests
      </Button>

      <Dialog
        open={browseOpen}
        onClose={handleBrowseClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(12,16,28,0.98)',
              border: '1px solid rgba(156,187,217,0.22)',
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          All interests
          <IconButton
            onClick={handleBrowseClose}
            aria-label="Close"
            size="small"
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            borderColor: 'rgba(156,187,217,0.15)',
            maxHeight: 'min(78vh, 640px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            ...DIALOG_SCROLLBAR_HIDE_SX,
          }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Search all interests…"
            value={browseSearch}
            onChange={(e) => setBrowseSearch(e.target.value)}
            sx={{ ...outlinedFieldSx, mb: 2 }}
            inputProps={{ 'aria-label': 'Search all interests' }}
          />
          <Stack spacing={2}>
            {browseCategories.map((cat) => {
              if (cat === 'Other') {
                return (
                  <Box
                    key={cat}
                    data-testid={joinInterestCategoryAccordionTestId('Other')}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.55)',
                        mb: 0.75,
                        letterSpacing: '0.06em',
                      }}
                    >
                      CUSTOM
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <TextField
                        size="small"
                        placeholder="Type a custom interest…"
                        value={dialogOtherInput}
                        onChange={(e) =>
                          setDialogOtherInput(
                            e.target.value.slice(
                              0,
                              INTEREST_CUSTOM_OTHER_MAX_LENGTH,
                            ),
                          )
                        }
                        disabled={atMax}
                        inputProps={{
                          maxLength: INTEREST_CUSTOM_OTHER_MAX_LENGTH,
                          'data-testid': 'join-interests-custom-other-input',
                        }}
                        helperText={`${dialogOtherInput.length}/${INTEREST_CUSTOM_OTHER_MAX_LENGTH}`}
                        sx={{ ...outlinedFieldSx, flex: '1 1 240px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddCustom(dialogOtherInput, () =>
                              setDialogOtherInput(''),
                            );
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        disableElevation
                        disabled={atMax || !dialogOtherInput.trim()}
                        onClick={() =>
                          void handleAddCustom(dialogOtherInput, () =>
                            setDialogOtherInput(''),
                          )
                        }
                        aria-label="Add custom interest"
                        sx={{
                          ...joinFlowPrimaryButtonSx,
                          alignSelf: 'center',
                          py: 0.75,
                          px: 2,
                          minHeight: 44,
                          fontSize: '0.875rem',
                        }}
                      >
                        Add custom
                      </Button>
                    </Stack>
                  </Box>
                );
              }
              const opts = filterOptions(
                INTEREST_OPTIONS_BY_CATEGORY[cat],
                qBrowse,
              );
              if (opts.length === 0) return null;
              return (
                <Box
                  key={cat}
                  data-testid={joinInterestCategoryAccordionTestId(cat)}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.55)',
                      mb: 0.75,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {cat.toUpperCase()}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                    {opts.map((label) => {
                      const selected = value.includes(label);
                      const blockedByMax = !selected && atMax && !disabled;
                      return (
                        <Tooltip
                          key={label}
                          title={
                            blockedByMax
                              ? 'Maximum interests reached. Remove one to add another.'
                              : ''
                          }
                          disableHoverListener={!blockedByMax}
                          enterTouchDelay={0}
                        >
                          <Box component="span" sx={{ display: 'inline-flex' }}>
                            <Button
                              type="button"
                              size="small"
                              variant={selected ? 'contained' : 'outlined'}
                              disableElevation
                              disabled={disabled || (!selected && atMax)}
                              onClick={() => handleTaxonomySelect(label)}
                              sx={{
                                ...(selected
                                  ? joinFlowInterestPillSelectedSx
                                  : joinFlowInterestPillIdleSx),
                                '&.Mui-disabled': { opacity: 0.4 },
                              }}
                              aria-pressed={selected}
                              aria-label={
                                selected ? `Remove ${label}` : `Add ${label}`
                              }
                            >
                              {label}
                            </Button>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={handleBrowseClose}
            variant="contained"
            disableElevation
            sx={joinFlowPrimaryButtonSx}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
