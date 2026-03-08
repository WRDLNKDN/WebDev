import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Alert,
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
} from '../../constants/platforms';
import { toMessage } from '../../lib/utils/errors';
import {
  dialogSelectSx,
  dialogTextFieldSx,
  filterSelectMenuProps,
} from '../../theme/filterControls';
import { getPortfolioUrlSafetyError } from '../../lib/portfolio/linkValidation';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  getShortLinkLabel,
  normalizeUrlForDedup,
} from '../../lib/utils/linkPlatform';
import type { LinkCategory, SocialLink } from '../../types/profile';
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
        sx={{
          textTransform: 'uppercase',
          letterSpacing: 0.3,
          color: 'text.secondary',
        }}
      >
        {text}
        {required ? ' *' : ''}
      </Typography>
      <Tooltip title={tooltip}>
        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      </Tooltip>
    </Stack>
  );

  const availablePlatforms = useMemo(
    () =>
      newCategory
        ? [
            ...PLATFORM_OPTIONS.filter((p) => p.category === newCategory),
            { label: 'Other', value: OTHER_PLATFORM, category: newCategory },
          ]
        : [],
    [newCategory],
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
    return Boolean(newCategory || newPlatform.trim() || newUrl.trim());
  }, [links, newCategory, newPlatform, newUrl]);

  // #609: within each category, sort alphabetically by label (case-insensitive).
  // The `order` property is preserved on link objects for DB persistence but is
  // no longer used as a display sort key.
  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        const labelA = (a.label || a.platform || '').toLowerCase();
        const labelB = (b.label || b.platform || '').toLowerCase();
        const labelCmp = labelA.localeCompare(labelB);
        if (labelCmp !== 0) return labelCmp;
        return a.id.localeCompare(b.id);
      }),
    [links],
  );

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
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleMoveUp = (linkId: string) => {
    const sorted = [...sortedLinks];
    const idx = sorted.findIndex((l) => l.id === linkId);
    if (idx <= 0) return;
    [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    const reordered = sorted.map((link, i) => ({ ...link, order: i }));
    setLinks(reordered);
  };

  const handleMoveDown = (linkId: string) => {
    const sorted = [...sortedLinks];
    const idx = sorted.findIndex((l) => l.id === linkId);
    if (idx < 0 || idx >= sorted.length - 1) return;
    [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    const reordered = sorted.map((link, i) => ({ ...link, order: i }));
    setLinks(reordered);
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
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            handleRequestClose();
          }
        }}
        maxWidth="sm"
        fullWidth
        aria-label="Manage Links"
      >
        <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>Manage Links</DialogTitle>
        <Tooltip title="Close">
          <IconButton
            aria-label="Close"
            onClick={handleRequestClose}
            sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
        <DialogContent sx={{ pt: 2.5 }}>
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
                    <Select
                      value={newPlatform}
                      displayEmpty
                      renderValue={(v) => v || 'Select platform'}
                      MenuProps={filterSelectMenuProps}
                      sx={dialogSelectSx}
                      inputProps={{ 'aria-label': 'Platform' }}
                      onChange={(e) => setNewPlatform(e.target.value)}
                    >
                      <MenuItem value="">Select platform</MenuItem>
                      {availablePlatforms.map((p) => (
                        <MenuItem key={p.value} value={p.value}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <LinkIcon
                              platform={p.value}
                              sx={{ width: 18, fontSize: '1rem' }}
                            />
                            <Typography variant="body2">{p.label}</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
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

              {CATEGORY_ORDER.map((category) => {
                const categoryLinks = sortedLinks.filter(
                  (link) => link.category === category,
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
                      const globalIndex = sortedLinks.findIndex(
                        (l) => l.id === link.id,
                      );
                      const canMoveUp = globalIndex > 0;
                      const canMoveDown =
                        globalIndex >= 0 &&
                        globalIndex < sortedLinks.length - 1;
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
                            bgcolor: 'rgba(255,255,255,0.04)',
                            '&:hover': {
                              borderColor: 'rgba(255,255,255,0.2)',
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
                                {getShortLinkLabel(link.url)}
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
                            <Tooltip title="Move up">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveUp(link.id)}
                                  disabled={!canMoveUp}
                                  aria-label={`Move ${link.label || link.platform} up`}
                                  sx={{
                                    p: 0.25,
                                    minWidth: 0,
                                    minHeight: 0,
                                  }}
                                >
                                  <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Move down">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveDown(link.id)}
                                  disabled={!canMoveDown}
                                  aria-label={`Move ${link.label || link.platform} down`}
                                  sx={{
                                    p: 0.25,
                                    minWidth: 0,
                                    minHeight: 0,
                                  }}
                                >
                                  <KeyboardArrowDownIcon
                                    sx={{ fontSize: 18 }}
                                  />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip
                              title={`Remove ${link.label || link.platform}`}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(link.id)}
                                aria-label={`Remove ${link.label || link.platform}`}
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

        <DialogActions sx={{ p: 3 }}>
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
