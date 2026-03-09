import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  CATEGORY_ORDER,
  PLATFORM_OPTIONS,
  getCategoryForPlatform,
} from '../../../constants/platforms';
import { toMessage } from '../../../lib/utils/errors';
import { getPortfolioUrlSafetyError } from '../../../lib/portfolio/linkValidation';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  normalizeUrlForDedup,
} from '../../../lib/utils/linkPlatform';
import { compareLinksByTitle } from '../../../lib/profile/linkTitle';
import type { LinkCategory, SocialLink } from '../../../types/profile';
import { EditLinksDialogView } from './EditLinksDialogView';

export const ADD_TO_LIST_BUTTON_LABEL = '+ Add to List';

type EditLinksDialogProps = {
  open: boolean;
  onClose: () => void;
  currentLinks: SocialLink[];
  onUpdate: (updates: { socials: SocialLink[] }) => Promise<void>;
  existingProjectUrls?: (string | null)[];
};

export const EditLinksDialog = ({
  open,
  onClose,
  currentLinks,
  onUpdate,
  existingProjectUrls = [],
}: EditLinksDialogProps) => {
  const OTHER_PLATFORM = 'other';
  const [links, setLinks] = useState<SocialLink[]>(
    Array.isArray(currentLinks) ? currentLinks : [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const wasOpenRef = useRef(false);
  const initialLinksRef = useRef<SocialLink[]>([]);

  const [newCategory, setNewCategory] = useState<LinkCategory | ''>(
    'Professional',
  );
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('https://');
  const [newLabel, setNewLabel] = useState('');
  const [addAttempted, setAddAttempted] = useState(false);

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

  const hasValidUrl = useMemo(() => {
    const u = newUrl.trim();
    if (!u) return false;
    try {
      new URL(u.startsWith('http') ? u : `https://${u}`);
      return true;
    } catch {
      return false;
    }
  }, [newUrl]);

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

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        const labelCmp = compareLinksByTitle(a, b);
        if (labelCmp !== 0) return labelCmp;
        return a.id.localeCompare(b.id);
      }),
    [links],
  );

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

  const handleAddLink = () => {
    setAddAttempted(true);
    if (!newCategory || urlSafetyError || !canAddLink) return;
    if (
      normalizedNewUrl.length > 0 &&
      links.some((l) => normalizeUrlForDedup(l.url) === normalizedNewUrl)
    )
      return;
    if (
      normalizedNewUrl.length > 0 &&
      normalizedPortfolioUrls.has(normalizedNewUrl)
    )
      return;

    const platform = newPlatform.trim();
    const nextOrder =
      links.reduce((max, link) => Math.max(max, link.order), -1) + 1;
    setLinks((prev) => [
      ...prev,
      {
        id: uuidv4(),
        category: newCategory,
        platform,
        url: normalizedNewUrl,
        label:
          newLabel?.trim() ||
          (platform.toLowerCase() === OTHER_PLATFORM ? 'Link' : platform),
        isVisible: true,
        order: nextOrder,
      },
    ]);
    setNewPlatform('');
    setNewUrl('https://');
    setNewLabel('');
    setAddAttempted(false);
  };

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges) setUnsavedConfirmOpen(true);
    else onClose();
  }, [hasUnsavedChanges, onClose]);

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
      setSaveError(toMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EditLinksDialogView
      open={open}
      onCloseRequested={handleRequestClose}
      unsavedConfirmOpen={unsavedConfirmOpen}
      onDismissUnsaved={() => setUnsavedConfirmOpen(false)}
      onDiscardAndClose={() => {
        setUnsavedConfirmOpen(false);
        onClose();
      }}
      saveError={saveError}
      onClearSaveError={() => setSaveError(null)}
      newCategory={newCategory}
      newPlatform={newPlatform}
      newUrl={newUrl}
      newLabel={newLabel}
      onCategoryChange={(category) => {
        setNewCategory(category);
        setNewPlatform(category === 'Custom' ? OTHER_PLATFORM : '');
      }}
      setNewPlatform={setNewPlatform}
      onUrlInputChange={(nextUrl) => {
        setNewUrl(nextUrl);
        if (newPlatform.trim()) return;
        const detected = detectPlatformFromUrl(nextUrl);
        if (!nextUrl.trim() || detected === 'Custom') return;
        setNewCategory(getCategoryForPlatform(detected));
        setNewPlatform(detected);
      }}
      setNewLabel={setNewLabel}
      availablePlatforms={availablePlatforms.map((p) => ({
        label: p.label,
        value: p.value,
      }))}
      categoryError={categoryError}
      platformError={platformError}
      addAttempted={addAttempted}
      urlSafetyError={urlSafetyError}
      isDuplicateUrl={isDuplicateUrl}
      isDuplicatePortfolioUrl={isDuplicatePortfolioUrl}
      urlFormatError={urlFormatError}
      canAddLink={canAddLink}
      onAddLink={handleAddLink}
      duplicateLinksInList={duplicateLinksInList}
      linksOverlapPortfolio={linksOverlapPortfolio}
      links={links}
      sortedLinks={sortedLinks}
      onMoveUp={(linkId) => {
        const sorted = [...sortedLinks];
        const idx = sorted.findIndex((l) => l.id === linkId);
        if (idx <= 0) return;
        [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
        setLinks(sorted.map((link, i) => ({ ...link, order: i })));
      }}
      onMoveDown={(linkId) => {
        const sorted = [...sortedLinks];
        const idx = sorted.findIndex((l) => l.id === linkId);
        if (idx < 0 || idx >= sorted.length - 1) return;
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
        setLinks(sorted.map((link, i) => ({ ...link, order: i })));
      }}
      onDelete={(id) => setLinks((prev) => prev.filter((l) => l.id !== id))}
      onSave={handleSave}
      isSubmitting={isSubmitting}
      addToListLabel={ADD_TO_LIST_BUTTON_LABEL}
      otherPlatformValue={OTHER_PLATFORM}
    />
  );
};
