import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useEligibleChatConnectionPicker } from '../../../lib/chat/useEligibleChatConnectionPicker';

type StartDmDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => Promise<void>;
  /** Shown when starting the chat failed (e.g. createDm failed). */
  startError?: string | null;
};

export const StartDmDialog = ({
  open,
  onClose,
  onSelect,
  startError,
}: StartDmDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    connections,
    filteredConnections,
    loadingConnections,
    loadError,
    searchInputRef,
    searchQuery,
    setSearchQuery,
  } = useEligibleChatConnectionPicker(open);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const handleSelect = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onSelect(userId);
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: string })?.message === 'string'
            ? (e as { message: string }).message
            : "We couldn't start a chat with this member. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        Start a chat
        <Tooltip title="Close">
          <span>
            <IconButton
              aria-label="Close"
              onClick={onClose}
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Only your connections can receive 1:1 messages.
        </Typography>
        {(error || loadError || startError) && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error || loadError || startError}
          </Typography>
        )}
        {connections.length > 0 && (
          <TextField
            fullWidth
            size="small"
            inputRef={searchInputRef}
            placeholder="Search connections by name, handle, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || loading) return;
              const firstMatch = filteredConnections[0];
              if (!firstMatch) return;
              event.preventDefault();
              void handleSelect(firstMatch.id);
            }}
            sx={{
              mb: 1,
              '& .MuiInputBase-root': {
                minHeight: 44,
                height: 44,
                alignItems: 'center',
              },
            }}
            inputProps={{ 'aria-label': 'Search connections' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        )}
        {loadingConnections ? (
          <Typography variant="body2" color="text.secondary">
            Loading connections…
          </Typography>
        ) : (
          <List dense disablePadding>
            {filteredConnections.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => void handleSelect(c.id)}
                disabled={loading}
                sx={{ py: 0.75 }}
              >
                <Typography variant="body2">
                  {c.display_name || c.handle || c.id}
                </Typography>
                {c.handle && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    @{c.handle}
                  </Typography>
                )}
              </ListItemButton>
            ))}
          </List>
        )}
        {!loadingConnections && connections.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No connections yet. Connect with people from the Directory or Feed.
          </Typography>
        )}
        {!loadingConnections &&
          connections.length > 0 &&
          filteredConnections.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No connections match &quot;{searchQuery.trim()}&quot;.
            </Typography>
          )}
        {!loadingConnections && filteredConnections.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Press Enter to start a chat with the first result.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
