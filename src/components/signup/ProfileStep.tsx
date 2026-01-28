import { useRef, useState, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Avatar,
  IconButton,
  Alert,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';

import { useSignup } from '../../context/useSignup';
import type { ProfileData } from '../../types/signup';

export const ProfileStep = () => {
  const { state, setProfile, goToStep, completeStep } = useSignup();

  const [displayName, setDisplayName] = useState(
    state.profile?.displayName || '',
  );
  const [tagline, setTagline] = useState(state.profile?.tagline || '');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    state.profile?.avatar,
  );
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const persist = () => {
    const profileData: ProfileData = {
      displayName: displayName.trim() || undefined,
      tagline: tagline.trim() || undefined,
      avatar: avatarPreview,
    };
    setProfile(profileData);
  };

  const handleBack = () => {
    persist();
    goToStep('values');
  };

  const handleSkip = () => {
    setProfile({});
    completeStep('profile');
    goToStep('complete');
  };

  const handleContinue = () => {
    persist();
    completeStep('profile');
    goToStep('complete');
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Soft Profile
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              All fields are optional. You can always add more later.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={avatarPreview}
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: 'primary.main',
                  fontSize: '3rem',
                }}
              >
                {displayName ? displayName[0].toUpperCase() : '?'}
              </Avatar>

              <IconButton
                onClick={handleAvatarClick}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'background.default' },
                }}
              >
                <PhotoCamera />
              </IconButton>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </Box>

            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Click to upload a profile picture (optional)
            </Typography>
          </Box>

          <TextField
            label="Display Name"
            placeholder="How should we call you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 50 }}
            helperText="This can be your real name, nickname, or handle"
          />

          <TextField
            label="Tagline"
            placeholder="A quick one-liner about what you do"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 100 }}
            helperText={`${tagline.length}/100`}
          />

          <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
            <Button variant="text" onClick={handleBack}>
              Back
            </Button>
            <Button variant="text" onClick={handleSkip} sx={{ flex: 1 }}>
              Skip
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              sx={{ flex: 1 }}
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};
