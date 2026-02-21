// src/pages/content/ContentSubmitPage.tsx

import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getUploadUrl, submitContent } from '../../lib/api/contentApi';
import { toMessage } from '../../lib/utils/errors';

export const ContentSubmitPage = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'youtube' | 'upload'>('youtube');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [notesForModerators, setNotesForModerators] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (type === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError('YouTube URL is required');
        return;
      }
    } else {
      if (!file) {
        setError('Please select a video file to upload');
        return;
      }
    }

    setUploading(true);
    try {
      if (type === 'upload' && file) {
        const { uploadUrl, storagePath } = await getUploadUrl(
          file.name,
          file.type || 'video/mp4',
        );
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'video/mp4',
          },
        });
        if (!putRes.ok) throw new Error('Upload failed');
        await submitContent({
          title: title.trim(),
          description: description.trim() || undefined,
          type: 'upload',
          storagePath,
        });
      } else {
        await submitContent({
          title: title.trim(),
          description: description.trim() || undefined,
          type: 'youtube',
          youtubeUrl: youtubeUrl.trim(),
          notesForModerators: notesForModerators.trim() || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="success.main" gutterBottom>
          Submission received
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your content has been submitted for review. You will be notified when
          it is reviewed.
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Submit content for WRDLNKDN
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Submit a YouTube link or upload a video for consideration on the
        WRDLNKDN channel. Moderation may take a few days.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Type
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
              }}
            >
              <Button
                variant={type === 'youtube' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setType('youtube')}
              >
                YouTube link
              </Button>
              <Button
                variant={type === 'upload' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setType('upload')}
              >
                Upload video
              </Button>
            </Stack>
          </Box>

          {type === 'youtube' && (
            <TextField
              fullWidth
              label="YouTube URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          )}

          {type === 'upload' && (
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ py: 2 }}
            >
              {file ? file.name : 'Choose video file (MP4, WebM)'}
              <input
                type="file"
                hidden
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>
          )}

          <TextField
            fullWidth
            label="Notes for moderators (optional)"
            value={notesForModerators}
            onChange={(e) => setNotesForModerators(e.target.value)}
            multiline
            rows={2}
            placeholder="Any context that might help reviewers..."
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={uploading}
            fullWidth
          >
            {uploading ? 'Submitting…' : 'Submit'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
