import { TextField } from '@mui/material';

type SharePostOptionalMessageFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export const SharePostOptionalMessageField = ({
  value,
  onChange,
}: SharePostOptionalMessageFieldProps) => (
  <TextField
    fullWidth
    size="small"
    placeholder="Add a message (optional)"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    multiline
    minRows={2}
    maxRows={4}
    sx={{ mt: 1 }}
    inputProps={{ 'aria-label': 'Optional message' }}
  />
);
