import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { EditLinksDialogViewProps } from './EditLinksDialogTypes';
import {
  AddNewLinkSection,
  CurrentLinksSection,
} from './EditLinksDialogSections';

export const EditLinksDialogView = ({
  open,
  onCloseRequested,
  unsavedConfirmOpen,
  onDismissUnsaved,
  onDiscardAndClose,
  saveError,
  onClearSaveError,
  newCategory,
  newPlatform,
  newUrl,
  newLabel,
  onCategoryChange,
  setNewPlatform,
  onUrlInputChange,
  setNewLabel,
  availablePlatforms,
  categoryError,
  platformError,
  addAttempted,
  urlSafetyError,
  isDuplicateUrl,
  isDuplicatePortfolioUrl,
  urlFormatError,
  canAddLink,
  onAddLink,
  duplicateLinksInList,
  linksOverlapPortfolio,
  links,
  sortedLinks,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSave,
  isSubmitting,
  addToListLabel,
  otherPlatformValue,
}: EditLinksDialogViewProps) => (
  <>
    <Dialog
      open={open}
      onClose={(_ev, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onCloseRequested();
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
          onClick={onCloseRequested}
          sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={4} sx={{ mt: 1 }}>
          {saveError && (
            <Alert severity="error" onClose={onClearSaveError}>
              {saveError}
            </Alert>
          )}

          <AddNewLinkSection
            newCategory={newCategory}
            newPlatform={newPlatform}
            newUrl={newUrl}
            newLabel={newLabel}
            onCategoryChange={onCategoryChange}
            setNewPlatform={setNewPlatform}
            onUrlInputChange={onUrlInputChange}
            setNewLabel={setNewLabel}
            availablePlatforms={availablePlatforms}
            categoryError={categoryError}
            platformError={platformError}
            addAttempted={addAttempted}
            urlSafetyError={urlSafetyError}
            isDuplicateUrl={isDuplicateUrl}
            isDuplicatePortfolioUrl={isDuplicatePortfolioUrl}
            urlFormatError={urlFormatError}
            canAddLink={canAddLink}
            onAddLink={onAddLink}
            addToListLabel={addToListLabel}
            otherPlatformValue={otherPlatformValue}
          />

          <CurrentLinksSection
            duplicateLinksInList={duplicateLinksInList}
            linksOverlapPortfolio={linksOverlapPortfolio}
            linksLength={links.length}
            sortedLinks={sortedLinks}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onCloseRequested} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
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
      onClose={onDismissUnsaved}
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
        <Button onClick={onDismissUnsaved} color="inherit">
          Continue Editing
        </Button>
        <Button variant="contained" color="primary" onClick={onDiscardAndClose}>
          Discard
        </Button>
      </DialogActions>
    </Dialog>
  </>
);
