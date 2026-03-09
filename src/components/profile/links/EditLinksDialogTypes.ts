import type { LinkCategory, SocialLink } from '../../../types/profile';

export type EditLinksDialogViewProps = {
  open: boolean;
  onCloseRequested: () => void;
  unsavedConfirmOpen: boolean;
  onDismissUnsaved: () => void;
  onDiscardAndClose: () => void;
  saveError: string | null;
  onClearSaveError: () => void;
  newCategory: LinkCategory | '';
  newPlatform: string;
  newUrl: string;
  newLabel: string;
  onCategoryChange: (value: LinkCategory | '') => void;
  setNewPlatform: (value: string) => void;
  onUrlInputChange: (value: string) => void;
  setNewLabel: (value: string) => void;
  availablePlatforms: Array<{ label: string; value: string }>;
  categoryError: boolean;
  platformError: boolean;
  addAttempted: boolean;
  urlSafetyError: string;
  isDuplicateUrl: boolean;
  isDuplicatePortfolioUrl: boolean;
  urlFormatError: boolean;
  canAddLink: boolean;
  onAddLink: () => void;
  duplicateLinksInList: string | null;
  linksOverlapPortfolio: boolean;
  links: SocialLink[];
  sortedLinks: SocialLink[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  isSubmitting: boolean;
  addToListLabel: string;
  otherPlatformValue: string;
};

export type FieldLabelProps = {
  text: string;
  tooltip: string;
  required?: boolean;
};
