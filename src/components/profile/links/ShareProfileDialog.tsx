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
  Tooltip,
  Typography,
  useTheme,
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

const SHARE_DIALOG_SX = (theme: {
  palette: {
    mode: string;
    background: { paper: string };
    text: { primary: string };
  };
}) => ({
  bgcolor: theme.palette.background.paper,
  backgroundImage:
    theme.palette.mode === 'light'
      ? 'linear-gradient(rgba(56,132,210,0.08), rgba(255,255,255,0))'
      : 'linear-gradient(rgba(56,132,210,0.12), rgba(255,255,255,0))',
  border: '1px solid rgba(156,187,217,0.22)',
  color: theme.palette.text.primary,
  borderRadius: 3,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 20px 40px rgba(15, 23, 42, 0.15)'
      : '0 20px 40px rgba(0,0,0,0.8)',
});

export const ShareProfileDialog = ({
  open,
  onClose,
  shareUrl,
  shareTokenLoading,
  shareTokenError,
  onCopy,
  onRegenerate,
  regenerateBusy = false,
}: ShareProfileDialogProps) => {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="share-profile-dialog-title"
      PaperProps={{ sx: SHARE_DIALOG_SX(theme) }}
    >
      <DialogTitle
        id="share-profile-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          pt: 3,
          pb: 2,
          fontWeight: 700,
        }}
      >
        <Typography
          component="span"
          variant="h6"
          sx={{ fontWeight: 700, flex: 1 }}
        >
          Share My Profile
        </Typography>
        <Tooltip title="Close">
          <IconButton
            onClick={onClose}
            aria-label="Close share profile modal"
            size="small"
            sx={{ flexShrink: 0, ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(156,187,217,0.18)' }}>
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
                {shareTokenError ??
                  'Unable to load share link. Try refreshing.'}
              </Alert>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
