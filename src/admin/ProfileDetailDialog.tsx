import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';
import type { ProfileRow } from './adminApi';

type Props = {
  open: boolean;
  profile: ProfileRow | null;
  onClose: () => void;
};

export const ProfileDetailDialog = ({ open, profile, onClose }: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Profile details</DialogTitle>
      <DialogContent dividers>
        {!profile ? (
          <Typography>—</Typography>
        ) : (
          <Box
            component="pre"
            sx={{
              m: 0,
              fontFamily: 'monospace',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(profile, null, 2)}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
