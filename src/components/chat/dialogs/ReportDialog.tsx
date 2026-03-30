import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { shouldSubmitWithModifier } from '../../../lib/ui/dialogFormUtils';
import type { ChatReportCategory } from '../../../types/chat';

type ReportDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    messageId: string | null,
    userId: string | null,
    category: ChatReportCategory,
    freeText?: string,
  ) => Promise<void>;
  reportedMessageId?: string | null;
  reportedUserId?: string | null;
};

const CATEGORIES: { value: ChatReportCategory; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export const ReportDialog = ({
  open,
  onClose,
  onSubmit,
  reportedMessageId,
  reportedUserId,
}: ReportDialogProps) => {
  const detailsInputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<ChatReportCategory>('other');
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusHandle = window.setTimeout(() => {
      detailsInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusHandle);
  }, [open]);

  const handleSubmit = async () => {
    if (!reportedMessageId && !reportedUserId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(
        reportedMessageId ?? null,
        reportedUserId ?? null,
        category,
        freeText.trim() || undefined,
      );
      onClose();
      setCategory('other');
      setFreeText('');
    } catch {
      setError('Your report could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          Report
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
        <DialogContent sx={{ pt: 1 }}>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) =>
                setCategory(e.target.value as ChatReportCategory)
              }
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            inputRef={detailsInputRef}
            multiline
            rows={3}
            label="Additional details (optional)"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(event) => {
              if (shouldSubmitWithModifier(event) && !submitting) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Describe what happened…"
            helperText="Press Ctrl+Enter or Cmd+Enter to submit."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
