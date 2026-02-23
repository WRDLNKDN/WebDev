import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { CANDY_HAZARD, CANDY_SUCCESS } from '../../theme/candyStyles';

interface ResumeCardProps {
  url?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  onUpload?: (file: File) => void;
  isOwner?: boolean;
}

export const ResumeCard = ({
  url,
  thumbnailUrl,
  thumbnailStatus,
  onUpload,
  isOwner,
}: ResumeCardProps) => {
  const hasResume = Boolean(url);
  const hasThumbnail = Boolean(thumbnailUrl);
  const isPdf = typeof url === 'string' && url.toLowerCase().includes('.pdf');

  // BRAND PROTECTION: If no resume exists and user isn't the owner,
  // don't show a broken/empty state to the public.
  if (!hasResume && !isOwner) return null;

  return (
    <Paper
      sx={{
        // Spread the base style FIRST
        ...(hasResume ? CANDY_SUCCESS : CANDY_HAZARD),

        // Instance-specific overrides
        width: '100%',
        maxWidth: 360,
        minHeight: { xs: 280, md: 400 },
        height: { xs: 280, md: 400 },
        borderRadius: 3,
        scrollSnapAlign: 'start',
        position: 'relative',
      }}
    >
      {hasResume ? (
        <>
          <Box
            sx={{
              width: '100%',
              maxWidth: 300,
              height: { xs: 170, md: 240 },
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.25)',
              overflow: 'hidden',
              bgcolor: 'rgba(0,0,0,0.35)',
              mb: 2,
            }}
          >
            {hasThumbnail ? (
              <Box
                component="img"
                src={thumbnailUrl ?? ''}
                alt="Resume thumbnail preview"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : isPdf ? (
              <Box
                component="iframe"
                src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
                title="Resume preview"
                sx={{ width: '100%', height: '100%', border: 0 }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  p: 2,
                  textAlign: 'center',
                }}
              >
                {thumbnailStatus === 'pending' ? (
                  <>
                    <CircularProgress size={28} sx={{ mb: 1.25 }} />
                    <Typography variant="caption" color="text.secondary">
                      Generating preview...
                    </Typography>
                  </>
                ) : thumbnailStatus === 'failed' ? (
                  <>
                    <CheckCircleOutlineIcon sx={{ fontSize: 42, mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Preview failed. Open the document directly.
                    </Typography>
                  </>
                ) : (
                  <>
                    <CheckCircleOutlineIcon sx={{ fontSize: 42, mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Thumbnail preview available for PDF resumes.
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={1}>
            RESUME
          </Typography>
          <Button
            variant="outlined"
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 2, color: 'inherit', borderColor: 'currentColor' }}
          >
            View Document
          </Button>
        </>
      ) : (
        <>
          <UploadFileIcon sx={{ fontSize: { xs: 48, md: 60 }, mb: 2 }} />
          <Typography
            variant="h6"
            fontWeight={800}
            letterSpacing={1}
            sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
          >
            UPLOAD RESUME
          </Typography>
        </>
      )}

      {/* Logic for the invisible upload trigger - only when no resume yet */}
      {isOwner && !hasResume && (
        <Button
          component="label"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 1, // Ensure it's on top of the text
          }}
        >
          <input
            type="file"
            hidden
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) =>
              onUpload && e.target.files?.[0] && onUpload(e.target.files[0])
            }
          />
        </Button>
      )}
    </Paper>
  );
};
