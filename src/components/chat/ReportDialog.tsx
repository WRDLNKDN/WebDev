import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { ChatReportCategory } from '../../types/chat';

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
  const [category, setCategory] = useState<ChatReportCategory>('other');
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report</DialogTitle>
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
            onChange={(e) => setCategory(e.target.value as ChatReportCategory)}
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
          multiline
          rows={3}
          label="Additional details (optional)"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Describe what happened…"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
