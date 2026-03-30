import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
  CATEGORY_ORDER,
  PLATFORM_OPTIONS,
  getCategoryForPlatform,
} from '../../../constants/platforms';
import { DISPLAY_LINK_CATEGORY_ORDER } from '../../../lib/profile/socialLinksPresentation';
import { toMessage } from '../../../lib/utils/errors';
import {
  getDisplayLinkCategory,
  getSocialLinkTitle,
  sortSocialLinksForEdit,
} from '../../../lib/profile/socialLinksPresentation';
import {
  dialogSelectSx,
  dialogTextFieldSx,
  filterSelectMenuProps,
  PLATFORM_DROPDOWN_MAX_HEIGHT,
} from '../../../theme/filterControls';
import {
  shouldCloseDialogFromReason,
  shouldSubmitWithModifier,
} from '../../../lib/ui/dialogFormUtils';
import { getPortfolioUrlSafetyError } from '../../../lib/portfolio/linkValidation';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  normalizeUrlForDedup,
} from '../../../lib/utils/linkPlatform';
import type { LinkCategory, SocialLink } from '../../../types/profile';
import { LinkIcon } from './LinkIcon';

/** Button label for adding a link (single plus; no startIcon to avoid duplicate plus). */
export const ADD_TO_LIST_BUTTON_LABEL = '+ Add to List';

interface EditLinksDialogProps {
  open: boolean;
  onClose: () => void;
  currentLinks: SocialLink[];
  onUpdate: (updates: { socials: SocialLink[] }) => Promise<void>;
  /** Portfolio project URLs to treat as duplicates (link URL must not match any). */
  existingProjectUrls?: (string | null)[];
}

export const EditLinksDialog = ({
  open,
  onClose,
  currentLinks,
  onUpdate,
  existingProjectUrls = [],
}: EditLinksDialogProps) => {
  const OTHER_PLATFORM = 'other';
  // 1. SAFE INITIALIZATION (Prevents "map is not a function" crash)
  const [links, setLinks] = useState<SocialLink[]>(
    Array.isArray(currentLinks) ? currentLinks : [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const [linksDirty, setLinksDirty] = useState(false);
  const wasOpenRef = useRef(false);
  const initialLinksRef = useRef<SocialLink[]>([]);

  // Sync from profile only when dialog transitions closed -> open.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSaveError(null);
      const next = Array.isArray(currentLinks) ? [...currentLinks] : [];
      setLinks(next);
      initialLinksRef.current = next;
      setNewCategory('Professional');
      setNewPlatform('');
      setNewUrl('https://');
      setNewLabel('');
      setAddAttempted(false);
      setUnsavedConfirmOpen(false);
      setLinksDirty(false);
    }
    wasOpenRef.current = open;
  }, [open, currentLinks]);

  // Form state: Add New inputs — Category required first, then Platform, then URL
  const [newCategory, setNewCategory] = useState<LinkCategory | ''>(
    'Professional',
  );
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('https://');
  const [newLabel, setNewLabel] = useState('');
  const [addAttempted, setAddAttempted] = useState(false);

  const FieldLabel = ({
    text,
    tooltip,
    required = false,
  }: {
    text: string;
    tooltip: string;
    required?: boolean;
  }) => (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
      <Typography
        variant="caption"
        component="span"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          color: 'text.secondary',
        }}
      >
        {text}
        {required ? (
          <Box
            component="span"
            sx={{ color: 'error.main', fontWeight: 700, ml: 0.35 }}
          >
            *
          </Box>
        ) : null}
      </Typography>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      </Tooltip>
    </Stack>
  );

  const getPlatformGroupLabel = useCallback(
    (platformValue: string, category: LinkCategory | ''): string => {
      if (platformValue === OTHER_PLATFORM) return 'Custom';

      switch (category) {
        case 'Professional':
          if (['Figma', 'Dribbble', 'Behance'].includes(platformValue)) {
            return 'Design';
          }
          if (['Calendly', 'Notion'].includes(platformValue)) {
            return 'Workflow';
          }
          return 'Development';
        case 'Social':
          if (
            ['Discord', 'Reddit', 'Threads', 'Mastodon'].includes(platformValue)
          ) {
            return 'Community';
          }
          return 'Social Networks';
        case 'Content':
          if (['YouTube', 'Twitch'].includes(platformValue)) {
            return 'Video';
          }
          return 'Publishing';
        case 'Games':
          if (platformValue === OTHER_PLATFORM) {
            return 'Other';
          }
          if (
            [
              'Epic Games Store',
              'Nintendo eShop',
              'PlayStation Store',
              'Steam',
              'Xbox / Microsoft Store',
            ].includes(platformValue)
          ) {
            return 'Storefronts';
          }
          if (
            [
              'Armor Games',
              'Game Jolt',
              'itch.io',
              'Kongregate',
              'Newgrounds',
              'Roblox',
            ].includes(platformValue)
          ) {
            return 'Community Platforms';
          }
          return 'Playable & Dev';
        case 'Files':
          return 'File hosting';
        case 'Music':
          return 'Streaming & distribution';
        case 'Custom':
          return 'Custom';
        default:
          return 'Platforms';
      }
    },
    [OTHER_PLATFORM],
  );

  const availablePlatforms = useMemo(
    () =>
      newCategory
        ? [
            ...PLATFORM_OPTIONS.filter((p) => p.category === newCategory).sort(
              (a, b) =>
                a.label.localeCompare(b.label, undefined, {
                  sensitivity: 'base',
                }),
            ),
            { label: 'Other', value: OTHER_PLATFORM, category: newCategory },
          ].map((platform) => ({
            ...platform,
            group: getPlatformGroupLabel(platform.value, newCategory),
          }))
        : [],
    [getPlatformGroupLabel, newCategory],
  );

  const hasValidUrl = (() => {
    const u = newUrl.trim();
    if (!u) return false;
    try {
      new URL(u.startsWith('http') ? u : `https://${u}`);
      return true;
    } catch {
      return false;
    }
  })();
  const urlFormatError = Boolean(addAttempted && newUrl.trim() && !hasValidUrl);
  const urlSafetyError =
    newUrl.trim() && hasValidUrl ? getPortfolioUrlSafetyError(newUrl) : '';
  const normalizedNewUrl = normalizeUrlForDedup(newUrl);
  const normalizedPortfolioUrls = useMemo(
    () =>
      new Set(
        existingProjectUrls
          .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
          .map((u) => normalizeUrlForDedup(u)),
      ),
    [existingProjectUrls],
  );
  const isDuplicateUrl = useMemo(
    () =>
      normalizedNewUrl.length > 0 &&
      links.some((l) => normalizeUrlForDedup(l.url) === normalizedNewUrl),
    [links, normalizedNewUrl],
  );
  const isDuplicatePortfolioUrl = useMemo(
    () =>
      normalizedNewUrl.length > 0 &&
      normalizedPortfolioUrls.has(normalizedNewUrl),
    [normalizedNewUrl, normalizedPortfolioUrls],
  );
  const duplicateLinksInList = useMemo(
    () => findDuplicateNormalizedUrl(links.map((link) => link.url)),
    [links],
  );
  const linksOverlapPortfolio = useMemo(
    () =>
      links.some((link) =>
        normalizedPortfolioUrls.has(normalizeUrlForDedup(link.url)),
      ),
    [links, normalizedPortfolioUrls],
  );
  const canAddLink =
    Boolean(newCategory) &&
    newPlatform.trim().length > 0 &&
    hasValidUrl &&
    !urlSafetyError &&
    !isDuplicateUrl &&
    !isDuplicatePortfolioUrl;
  const platformError = addAttempted && !newPlatform.trim();
  const categoryError = addAttempted && !newCategory;

  const addFormHasContent = useMemo(() => {
    const normalizedDraftUrl = newUrl.trim();
    return (
      newCategory !== 'Professional' ||
      Boolean(newPlatform.trim()) ||
      Boolean(newLabel.trim()) ||
      (Boolean(normalizedDraftUrl) && normalizedDraftUrl !== 'https://')
    );
  }, [newCategory, newLabel, newPlatform, newUrl]);

  const hasUnsavedChanges = useMemo(() => {
    const initial = initialLinksRef.current;
    if (links.length !== initial.length) return true;
    const a = [...links].sort((x, y) => x.id.localeCompare(y.id));
    const b = [...initial].sort((x, y) => x.id.localeCompare(y.id));
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].url !== b[i]?.url ||
        a[i].platform !== b[i]?.platform ||
        a[i].category !== b[i]?.category ||
        a[i].order !== b[i]?.order
      )
        return true;
    }
    return linksDirty || addFormHasContent;
  }, [addFormHasContent, links, linksDirty]);

  const sortedLinks = useMemo(() => sortSocialLinksForEdit(links), [links]);

  // --- ACTIONS ---

  const handleAddLink = () => {
    setAddAttempted(true);
    if (!newCategory) return;
    if (urlSafetyError) return;
    // Block duplicate by normalized URL (defensive even if canAddLink is true)
    if (
      normalizedNewUrl.length > 0 &&
      links.some((l) => normalizeUrlForDedup(l.url) === normalizedNewUrl)
    ) {
      return;
    }
    if (
      normalizedNewUrl.length > 0 &&
      normalizedPortfolioUrls.has(normalizedNewUrl)
    ) {
      return;
    }
    if (!canAddLink) return;

    const platform = newPlatform.trim();
    const nextOrder =
      links.reduce((max, link) => Math.max(max, link.order), -1) + 1;
    const newLinkItem: SocialLink = {
      id: uuidv4(),
      category: newCategory,
      platform,
      url: normalizedNewUrl,
      label:
        newLabel?.trim() ||
        (platform.toLowerCase() === OTHER_PLATFORM ? 'Link' : platform),
      isVisible: true,
      order: nextOrder,
    };

    setLinks((prev) => [...prev, newLinkItem]);
    setLinksDirty(true);
    setNewPlatform('');
    setNewUrl('https://');
    setNewLabel('');
    setAddAttempted(false);
  };

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges) setUnsavedConfirmOpen(true);
    else onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    setUnsavedConfirmOpen(false);
    onClose();
  }, [onClose]);

  const handleDelete = (id: string) => {
    setLinksDirty(true);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSave = async () => {
    setSaveError(null);
    if (duplicateLinksInList) {
      setSaveError(
        'Duplicate URLs are not allowed. Remove duplicate links before saving.',
      );
      return;
    }
    if (linksOverlapPortfolio) {
      setSaveError(
        'A link URL is already used in your portfolio. Use a different URL or remove it from portfolio first.',
      );
      return;
    }
    try {
      setIsSubmitting(true);
      await onUpdate({ socials: links });
      onClose();
    } catch (error) {
      console.error('Failed to save links:', error);
      setSaveError(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(_ev, reason) => {
          if (shouldCloseDialogFromReason(reason)) {
            handleRequestClose();
          }
        }}
        maxWidth="sm"
        fullWidth
        aria-label="Manage Links"
        slotProps={{
          paper: {
            sx: {
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'min(90dvh, 900px)',
              // Contain scroll in content only so the header close control is never clipped.
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexShrink: 0,
            boxSizing: 'border-box',
            width: '100%',
            pl: 2,
            pr: 2,
            pt: 2,
            pb: 2,
            fontWeight: 700,
          }}
        >
          <Typography
            component="span"
            variant="h6"
            sx={{
              fontWeight: 700,
              flex: '1 1 auto',
              minWidth: 0,
              textAlign: 'start',
              pt: 0.25,
            }}
          >
            Manage Links
          </Typography>
          <Tooltip title="Close">
            <span>
              <IconButton
                aria-label="Close"
                onClick={handleRequestClose}
                color="inherit"
                size="medium"
                sx={{
                  flexShrink: 0,
                  // Avoid edge="end" negative margins — they extend past padded area and clip when paper overflow is hidden.
                  minWidth: 44,
                  minHeight: 44,
                  alignSelf: 'flex-start',
                }}
              >
                <CloseIcon />
              </IconButton>
            </span>
          </Tooltip>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 2.5,
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
          }}
          onKeyDown={(event) => {
            if (!shouldSubmitWithModifier(event) || isSubmitting) return;
            event.preventDefault();
            void handleSave();
          }}
        >
          <Stack spacing={4} sx={{ mt: 1 }}>
            {saveError && (
              <Alert severity="error" onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}
            {/* --- SECTION 1: ADD NEW LINK --- */}
            <Box
              sx={{
                p: 2,
                bgcolor: 'action.hover', // Subtle background
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
              >
                ADD NEW LINK
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth size="small" error={categoryError}>
                    <FieldLabel
                      text="Category"
                      required
                      tooltip="Choose the link grouping used on your profile."
                    />
                    <Select
                      value={newCategory}
                      displayEmpty
                      renderValue={(v) => v || 'Choose Category'}
                      MenuProps={filterSelectMenuProps}
                      sx={dialogSelectSx}
                      inputProps={{ 'aria-label': 'Category' }}
                      onChange={(e) => {
                        const category = e.target.value as LinkCategory | '';
                        setNewCategory(category);
                        setNewPlatform(
                          category === 'Custom' ? OTHER_PLATFORM : '',
                        );
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          !event.metaKey &&
                          !event.ctrlKey
                        ) {
                          event.preventDefault();
                          handleAddLink();
                        }
                      }}
                    >
                      <MenuItem value="">Choose Category</MenuItem>
                      {CATEGORY_ORDER.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                    {categoryError && (
                      <FormHelperText>Category is required.</FormHelperText>
                    )}
                  </FormControl>

                  <FormControl
                    fullWidth
                    size="small"
                    error={platformError}
                    disabled={!newCategory}
                  >
                    <FieldLabel
                      text="Platform"
                      required
                      tooltip="Select the service this URL points to."
                    />
                    <Autocomplete
                      disabled={!newCategory}
                      options={availablePlatforms}
                      value={
                        availablePlatforms.find(
                          (p) => p.value === newPlatform,
                        ) ?? null
                      }
                      onChange={(_, value) =>
                        setNewPlatform(value?.value ?? '')
                      }
                      getOptionLabel={(option) => option.label}
                      isOptionEqualToValue={(option, value) => {
                        if (value == null) return false;
                        return option.value === value.value;
                      }}
                      groupBy={(option) => option.group}
                      autoHighlight
                      clearOnBlur={false}
                      handleHomeEndKeys
                      slotProps={{
                        popupIndicator: {
                          sx: { color: 'rgba(156,187,217,0.82)' },
                        },
                        paper: {
                          sx: {
                            mt: 0.75,
                            borderRadius: 2,
                            bgcolor: 'rgba(20,20,20,0.98)',
                            border: '1px solid rgba(156,187,217,0.26)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
                            maxHeight: PLATFORM_DROPDOWN_MAX_HEIGHT,
                            overflowY: 'auto',
                            scrollBehavior: 'smooth',
                          },
                        },
                        popper: {
                          modifiers: [
                            {
                              name: 'offset',
                              options: { offset: [0, 8] },
                            },
                          ],
                        },
                      }}
                      renderGroup={(params) => (
                        <Box key={params.key}>
                          <Box
                            sx={{
                              px: 1.5,
                              py: 1,
                              bgcolor: 'rgba(56,132,210,0.10)',
                              borderTop: '1px solid rgba(56,132,210,0.12)',
                            }}
                          >
                            <Typography
                              variant="overline"
                              sx={{
                                color: 'text.secondary',
                                letterSpacing: 1,
                                fontWeight: 700,
                              }}
                            >
                              {params.group}
                            </Typography>
                          </Box>
                          {params.children}
                        </Box>
                      )}
                      renderOption={(props, option) => {
                        const { key, ...optionProps } = props;
                        return (
                          <Box component="li" key={key} {...optionProps}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <LinkIcon
                                platform={option.value}
                                sx={{ width: 18, fontSize: '1rem' }}
                              />
                              <Typography variant="body2">
                                {option.label}
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search platform"
                          onKeyDown={(event) => {
                            if (
                              event.key === 'Enter' &&
                              !event.metaKey &&
                              !event.ctrlKey
                            ) {
                              event.preventDefault();
                              handleAddLink();
                            }
                          }}
                          error={platformError}
                          inputProps={{
                            ...params.inputProps,
                            'aria-label': 'Platform',
                          }}
                          sx={{
                            /* dialogSelectSx hides the real <input> for Select ghosting — breaks Autocomplete */
                            ...dialogTextFieldSx,
                            '& .MuiOutlinedInput-input': {
                              py: '9px !important',
                              px: 1.75,
                              opacity: 1,
                              pointerEvents: 'auto',
                            },
                          }}
                        />
                      )}
                    />
                    {platformError && (
                      <FormHelperText>Platform is required.</FormHelperText>
                    )}
                  </FormControl>
                </Stack>

                <Box>
                  <FieldLabel
                    text="URL"
                    required
                    tooltip="Public URL for this link."
                  />
                  <TextField
                    placeholder="https://example.com"
                    size="small"
                    fullWidth
                    value={newUrl}
                    onChange={(e) => {
                      const nextUrl = e.target.value;
                      setNewUrl(nextUrl);

                      // Restore fast-add flow: infer platform/category from URL when platform isn't chosen yet.
                      if (newPlatform.trim()) return;
                      const detected = detectPlatformFromUrl(nextUrl);
                      if (!nextUrl.trim() || detected === 'Custom') return;

                      const detectedCategory = getCategoryForPlatform(detected);
                      setNewCategory(detectedCategory);
                      setNewPlatform(detected);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !event.metaKey &&
                        !event.ctrlKey
                      ) {
                        event.preventDefault();
                        handleAddLink();
                      }
                    }}
                    disabled={!newCategory}
                    error={Boolean(
                      (newUrl.trim() &&
                        (isDuplicateUrl ||
                          isDuplicatePortfolioUrl ||
                          urlSafetyError)) ||
                      (addAttempted && urlFormatError),
                    )}
                    helperText={
                      newUrl.trim() && urlSafetyError
                        ? urlSafetyError
                        : newUrl.trim() && isDuplicatePortfolioUrl
                          ? 'This URL is already used in your portfolio.'
                          : newUrl.trim() && isDuplicateUrl
                            ? 'This URL is already in your links.'
                            : addAttempted && urlFormatError
                              ? 'Enter a valid URL.'
                              : ''
                    }
                    sx={dialogTextFieldSx}
                  />
                </Box>

                {/* Conditional Label Input (Only for Custom links) */}
                {(newCategory === 'Custom' ||
                  newPlatform === OTHER_PLATFORM) && (
                  <Box>
                    <FieldLabel
                      text="Label"
                      tooltip="Optional short name to display for this custom link."
                    />
                    <TextField
                      placeholder="e.g. My Portfolio"
                      size="small"
                      fullWidth
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          !event.metaKey &&
                          !event.ctrlKey
                        ) {
                          event.preventDefault();
                          handleAddLink();
                        }
                      }}
                      sx={dialogTextFieldSx}
                    />
                  </Box>
                )}

                <Button
                  variant="outlined"
                  onClick={handleAddLink}
                  disabled={!canAddLink}
                  sx={{ alignSelf: 'flex-start' }}
                  aria-label={ADD_TO_LIST_BUTTON_LABEL}
                >
                  {ADD_TO_LIST_BUTTON_LABEL}
                </Button>
                {!canAddLink && addAttempted && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    To add a link: choose a category, choose a platform, and
                    enter a valid unique URL.
                  </Alert>
                )}
              </Stack>
            </Box>

            {/* --- SECTION 2: CURRENT LINKS LIST --- */}
            <Stack spacing={2}>
              {(duplicateLinksInList || linksOverlapPortfolio) && (
                <Alert severity="error">
                  {duplicateLinksInList
                    ? 'Duplicate URLs are already present in this list. Remove the duplicate before saving.'
                    : 'A link URL is already used in your portfolio. Use a different URL or remove it from portfolio first.'}
                </Alert>
              )}
              <Typography
                variant="subtitle2"
                sx={{ color: 'text.secondary', fontWeight: 600 }}
              >
                CURRENT LINKS
              </Typography>

              {links.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  align="center"
                  fontStyle="italic"
                >
                  No links added yet.
                </Typography>
              )}

              {DISPLAY_LINK_CATEGORY_ORDER.map((category) => {
                const categoryLinks = sortedLinks.filter(
                  (link) => getDisplayLinkCategory(link) === category,
                );
                if (categoryLinks.length === 0) return null;
                return (
                  <Stack
                    key={category}
                    spacing={1}
                    data-testid={`edit-link-group-${category}`}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        color: 'text.secondary',
                        letterSpacing: 1,
                        fontWeight: 700,
                      }}
                    >
                      {category}
                    </Typography>
                    {categoryLinks.map((link) => {
                      const platformForIcon =
                        link.platform?.trim() ||
                        detectPlatformFromUrl(link.url);
                      return (
                        <Box
                          key={link.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'rgba(56,132,210,0.10)',
                            '&:hover': {
                              borderColor: 'rgba(141,188,229,0.38)',
                            },
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}
                          >
                            <LinkIcon platform={platformForIcon} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                data-testid="edit-link-label"
                              >
                                {getSocialLinkTitle(link)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                display="block"
                              >
                                {link.url}
                              </Typography>
                            </Box>
                          </Stack>

                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.25}
                            sx={{ flexShrink: 0 }}
                          >
                            <Tooltip
                              title={`Remove ${getSocialLinkTitle(link)}`}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(link.id)}
                                  aria-label={`Remove ${getSocialLinkTitle(link)}`}
                                  sx={{
                                    p: 0.25,
                                    minWidth: 0,
                                    minHeight: 0,
                                    color: 'error.main',
                                    '&:hover': {
                                      bgcolor: 'error.main',
                                      color: 'error.contrastText',
                                    },
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, flexShrink: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mr: 'auto', display: { xs: 'none', sm: 'block' } }}
          >
            Cmd/Ctrl+Enter saves changes.
          </Typography>
          <Button onClick={handleRequestClose} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              isSubmitting ||
              Boolean(duplicateLinksInList) ||
              Boolean(linksOverlapPortfolio)
            }
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-desc"
      >
        <DialogTitle id="unsaved-changes-title">Unsaved changes</DialogTitle>
        <DialogContent>
          <Typography id="unsaved-changes-desc">
            You have unsaved changes. Discard changes?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnsavedConfirmOpen(false)} color="inherit">
            Continue Editing
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDiscardAndClose}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
