import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  profileId: string | null;
};

export const ProfileDetailDialog = ({ open, onClose, profileId }: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Profile Details</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Profile ID: {profileId}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Full profile details will be displayed here.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" color="success">
          Approve
        </Button>
        <Button variant="outlined" color="error">
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDetailDialog;
