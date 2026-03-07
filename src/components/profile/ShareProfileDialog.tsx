import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

type ShareProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  shareUrl: string | null;
  shareTokenLoading: boolean;
  shareTokenError: string | null;
  onCopy: () => Promise<void> | void;
  onRegenerate: () => void;
  regenerateBusy?: boolean;
};

export const ShareProfileDialog = ({
  open,
  onClose,
  shareUrl,
  shareTokenLoading,
  shareTokenError,
  onCopy,
  onRegenerate,
  regenerateBusy = false,
}: ShareProfileDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    aria-labelledby="share-profile-dialog-title"
  >
    <DialogTitle
      id="share-profile-dialog-title"
      sx={{ pr: 6, fontWeight: 700 }}
    >
      Share My Profile
      <IconButton
        onClick={onClose}
        aria-label="Close share profile modal"
        sx={{ position: 'absolute', right: 10, top: 10 }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Anyone with this link can view a read-only version of your profile.
          Your handle is not in the URL.
        </Typography>

        {shareTokenLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading link…
          </Typography>
        ) : shareUrl ? (
          <>
            <TextField
              size="small"
              fullWidth
              value={shareUrl}
              InputProps={{ readOnly: true }}
              inputProps={{ 'aria-label': 'Public profile URL' }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                },
              }}
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={() => void onCopy()}
                sx={{ textTransform: 'none' }}
              >
                Copy link
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={onRegenerate}
                disabled={regenerateBusy}
                sx={{ textTransform: 'none' }}
              >
                {regenerateBusy ? 'Regenerating…' : 'Regenerate link'}
              </Button>
            </Stack>
          </>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary">
              {shareTokenError ?? 'Unable to load share link. Try refreshing.'}
            </Typography>
          </Box>
        )}
      </Stack>
    </DialogContent>
  </Dialog>
);
