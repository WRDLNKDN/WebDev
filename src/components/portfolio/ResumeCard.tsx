import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Button, Paper, Typography } from '@mui/material';
import { CANDY_HAZARD, CANDY_SUCCESS } from '../../theme/candyStyles';

interface ResumeCardProps {
  url?: string | null;
  onUpload?: (file: File) => void;
  isOwner?: boolean;
}

export const ResumeCard = ({ url, onUpload, isOwner }: ResumeCardProps) => {
  const hasResume = Boolean(url);

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
          <CheckCircleOutlineIcon
            sx={{ fontSize: { xs: 48, md: 60 }, mb: 2 }}
          />
          <Typography
            variant="h6"
            fontWeight={800}
            letterSpacing={1}
            sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
          >
            RESUME.PDF
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
            accept=".pdf,.doc,.docx"
            onChange={(e) =>
              onUpload && e.target.files?.[0] && onUpload(e.target.files[0])
            }
          />
        </Button>
      )}
    </Paper>
  );
};
