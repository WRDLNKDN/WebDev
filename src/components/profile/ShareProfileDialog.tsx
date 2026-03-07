import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
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

const SHARE_DIALOG_SX = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: 3,
  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
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
    PaperProps={{ sx: SHARE_DIALOG_SX }}
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
    <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <Stack spacing={2.5}>
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
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {shareTokenError ?? 'Unable to load share link. Try refreshing.'}
            </Alert>
          </Box>
        )}
      </Stack>
    </DialogContent>
  </Dialog>
);
