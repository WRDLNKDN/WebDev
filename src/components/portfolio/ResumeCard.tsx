import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { getResumeDisplayName } from '../../lib/portfolio/resumeDisplayName';
import { CANDY_HAZARD, CANDY_SUCCESS } from '../../theme/candyStyles';

interface ResumeCardProps {
  url?: string | null;
  fileName?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  /** Server error message when thumbnail generation failed; shown inline so it persists until retry */
  thumbnailError?: string | null;
  onUpload?: (file: File) => void;
  onRetryThumbnail?: () => void;
  retryThumbnailBusy?: boolean;
  /** When provided and isOwner, shows trash icon to delete resume. Not shown on public profile. */
  onDelete?: () => void | Promise<void>;
  deleteBusy?: boolean;
  isOwner?: boolean;
}

export const ResumeCard = ({
  url,
  fileName,
  thumbnailUrl,
  thumbnailStatus,
  thumbnailError,
  onUpload: _onUpload,
  onRetryThumbnail,
  retryThumbnailBusy = false,
  onDelete,
  deleteBusy = false,
  isOwner,
}: ResumeCardProps) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const hasResume = Boolean(url);
  const hasThumbnail = Boolean(thumbnailUrl);
  const isPdf = typeof url === 'string' && url.toLowerCase().includes('.pdf');
  const resumeTitle = getResumeDisplayName({ fileName, url });
  const errorSuggestsUnsupported =
    typeof thumbnailError === 'string' &&
    (thumbnailError.toLowerCase().includes('not supported') ||
      thumbnailError.toLowerCase().includes('unsupported') ||
      thumbnailError.toLowerCase().includes('file type'));
  const showRetry =
    isOwner &&
    thumbnailStatus === 'failed' &&
    onRetryThumbnail &&
    !errorSuggestsUnsupported;

  const handleDeleteClick = () => setConfirmDeleteOpen(true);
  const handleConfirmDelete = async () => {
    if (onDelete) {
      await Promise.resolve(onDelete());
      setConfirmDeleteOpen(false);
    }
  };

  // BRAND PROTECTION: If no resume exists and user isn't the owner,
  // don't show a broken/empty state to the public.
  if (!hasResume && !isOwner) return null;

  // No ghost container: when owner has no resume, parent shows action buttons only.
  if (!hasResume && isOwner) return null;

  return (
    <>
      <Paper
        sx={{
          // Spread the base style FIRST
          ...(hasResume ? CANDY_SUCCESS : CANDY_HAZARD),

          // Instance-specific overrides (compact for Dashboard)
          width: '100%',
          maxWidth: { xs: '100%', sm: 320 },
          minHeight: { xs: 260, md: 320 },
          height: { xs: 260, md: 320 },
          borderRadius: 3,
          scrollSnapAlign: 'start',
          position: 'relative',
        }}
      >
        <>
          <Box
            sx={{
              width: '100%',
              maxWidth: 260,
              height: { xs: 200, md: 260 },
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
                      {errorSuggestsUnsupported
                        ? 'Preview not available for this file type.'
                        : 'Preview failed. Open the document directly.'}
                    </Typography>
                    {thumbnailError && !errorSuggestsUnsupported && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          display: 'block',
                          maxWidth: 260,
                          wordBreak: 'break-word',
                        }}
                      >
                        {thumbnailError}
                      </Typography>
                    )}
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
            <Tooltip title={resumeTitle} placement="top">
              <Box
                component="span"
                tabIndex={0}
                title={resumeTitle}
                data-testid="resume-file-name"
                sx={{
                  display: 'block',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                }}
              >
                {resumeTitle}
              </Box>
            </Tooltip>
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              mt: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                href={url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'inherit',
                  borderColor: 'currentColor',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                View Document
              </Button>
              {showRetry && (
                <Button
                  variant="text"
                  size="small"
                  sx={{ color: 'inherit' }}
                  disabled={retryThumbnailBusy}
                  onClick={onRetryThumbnail}
                >
                  {retryThumbnailBusy ? 'Retrying…' : 'Retry Preview'}
                </Button>
              )}
            </Box>
            {isOwner && onDelete && (
              <Tooltip title="Delete resume">
                <IconButton
                  size="small"
                  onClick={handleDeleteClick}
                  disabled={deleteBusy || retryThumbnailBusy}
                  aria-label="Delete resume"
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    '&:hover': {
                      bgcolor: 'rgba(255,77,77,0.25)',
                      color: '#ffe5e5',
                      borderColor: 'rgba(255,77,77,0.75)',
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </>
      </Paper>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !deleteBusy && setConfirmDeleteOpen(false)}
        aria-labelledby="resume-delete-dialog-title"
        aria-describedby="resume-delete-dialog-description"
      >
        <DialogTitle id="resume-delete-dialog-title">Delete resume</DialogTitle>
        <DialogContent id="resume-delete-dialog-description">
          <Typography>Are you sure you want to delete your resume?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={deleteBusy}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDelete()}
            disabled={deleteBusy}
          >
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
