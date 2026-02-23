import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { CATEGORY_ORDER, PLATFORM_OPTIONS } from '../../constants/platforms';
import { toMessage } from '../../lib/utils/errors';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../lib/utils/linkPlatform';
import type { LinkCategory, SocialLink } from '../../types/profile';
import { LinkIcon } from './LinkIcon';

interface EditLinksDialogProps {
  open: boolean;
  onClose: () => void;
  currentLinks: SocialLink[];
  onUpdate: (updates: { socials: SocialLink[] }) => Promise<void>;
}

export const EditLinksDialog = ({
  open,
  onClose,
  currentLinks,
  onUpdate,
}: EditLinksDialogProps) => {
  const OTHER_PLATFORM = 'other';
  // 1. SAFE INITIALIZATION (Prevents "map is not a function" crash)
  const [links, setLinks] = useState<SocialLink[]>(
    Array.isArray(currentLinks) ? currentLinks : [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  // Sync from profile only when dialog transitions closed -> open.
  // Prevents silent data loss when parent refreshes while user is editing.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSaveError(null);
      setLinks(Array.isArray(currentLinks) ? [...currentLinks] : []);
      setNewCategory('Professional');
      setNewPlatform('');
      setNewUrl('');
      setNewLabel('');
      setAddAttempted(false);
    }
    wasOpenRef.current = open;
  }, [open, currentLinks]);

  // 2. Form State: The "Add New" inputs
  const [newCategory, setNewCategory] = useState<LinkCategory>('Professional');
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addAttempted, setAddAttempted] = useState(false);

  // Filter the platform dropdown based on the chosen category
  const availablePlatforms = useMemo(
    () => [
      ...PLATFORM_OPTIONS.filter((p) => p.category === newCategory),
      { label: 'Other', value: OTHER_PLATFORM, category: newCategory },
    ],
    [newCategory],
  );
  const hasValidUrl = newUrl.trim().length > 0;
  const canAddLink = hasValidUrl && newPlatform.trim().length > 0;
  const platformError = addAttempted && !newPlatform.trim();

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        if (a.order !== b.order) return a.order - b.order;
        const labelCmp = (a.label || '').localeCompare(b.label || '');
        if (labelCmp !== 0) return labelCmp;
        const urlCmp = a.url.localeCompare(b.url);
        if (urlCmp !== 0) return urlCmp;
        return a.id.localeCompare(b.id);
      }),
    [links],
  );

  // --- ACTIONS ---

  const handleAddLink = () => {
    setAddAttempted(true);
    if (!canAddLink) return;

    const platform = newPlatform.trim();
    const nextOrder =
      links.reduce((max, link) => Math.max(max, link.order), -1) + 1;
    const newLinkItem: SocialLink = {
      id: uuidv4(),
      category: newCategory,
      platform,
      url: newUrl.trim(),
      label:
        newLabel?.trim() ||
        (platform.toLowerCase() === OTHER_PLATFORM ? 'Link' : platform),
      isVisible: true,
      order: nextOrder,
    };

    setLinks((prev) => [...prev, newLinkItem]);

    setNewPlatform('');
    setNewUrl('');
    setNewLabel('');
    setAddAttempted(false);
  };

  const handleDelete = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSave = async () => {
    setSaveError(null);
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label="Manage Links"
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ pt: 5 }}>
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
                {/* Category Dropdown */}
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newCategory}
                    label="Category"
                    onChange={(e) => {
                      setNewCategory(e.target.value as LinkCategory);
                      setNewPlatform('');
                    }}
                  >
                    {CATEGORY_ORDER.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Platform Dropdown */}
                <FormControl fullWidth size="small" error={platformError}>
                  <InputLabel>Platform</InputLabel>
                  <Select
                    value={newPlatform}
                    label="Platform"
                    onChange={(e) => setNewPlatform(e.target.value)}
                  >
                    {availablePlatforms.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        <Stack direction="row" spacing={1} alignItems="center">
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

              {/* URL Input */}
              <TextField
                label="URL"
                placeholder="https://..."
                size="small"
                fullWidth
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />

              {/* Conditional Label Input (Only for Custom links) */}
              {(newCategory === 'Custom' || newPlatform === OTHER_PLATFORM) && (
                <TextField
                  label="Label (e.g. My Portfolio)"
                  size="small"
                  fullWidth
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              )}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddLink}
                disabled={!canAddLink}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add to List
              </Button>
            </Stack>
          </Box>

          {/* --- SECTION 2: CURRENT LINKS LIST --- */}
          <Stack spacing={2}>
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
                <Stack key={category} spacing={1}>
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
                      link.platform?.trim() || detectPlatformFromUrl(link.url);
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
                            <Typography variant="body2" fontWeight={600} noWrap>
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

                        <IconButton
                          size="small"
                          onClick={() => handleDelete(link.id)}
                          aria-label={`Remove ${link.label || link.platform}`}
                          sx={{
                            flexShrink: 0,
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
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
