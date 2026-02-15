import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import type { ProfileRow } from './adminApi';

type Props = {
  open: boolean;
  profile: ProfileRow | null;
  onClose: () => void;
};

export const ProfileDetailDialog = ({ open, profile, onClose }: Props) => {
  if (!profile) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Profile Details</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {profile.id}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Handle
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {profile.handle}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={profile.status} size="small" />
            </Box>
          </Box>

          {profile.pronouns && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Pronouns
              </Typography>
              <Typography variant="body2">{profile.pronouns}</Typography>
            </Box>
          )}

          {profile.geek_creds && profile.geek_creds.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Geek Creds
              </Typography>
              <Box
                sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}
              >
                {profile.geek_creds.map((cred, i) => (
                  <Chip key={i} label={cred} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Created
            </Typography>
            <Typography variant="body2">
              {profile.created_at
                ? new Date(profile.created_at).toLocaleString()
                : '—'}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Updated
            </Typography>
            <Typography variant="body2">
              {profile.updated_at
                ? new Date(profile.updated_at).toLocaleString()
                : '—'}
            </Typography>
          </Box>

          {profile.reviewed_at && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Reviewed
              </Typography>
              <Typography variant="body2">
                {new Date(profile.reviewed_at).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDetailDialog;
