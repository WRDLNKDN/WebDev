import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  Box,
  Button,
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
import { getResumeDisplayName } from '../../../lib/portfolio/resumeDisplayName';
import { CANDY_BLUEY, CANDY_HAZARD } from '../../../theme/candyStyles';
import type { PortfolioItem } from '../../../types/portfolio';

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
  /** When provided (e.g. from sortable list), shown as drag handle for reorder. Same pattern as ProjectCard. */
  dragHandle?: React.ReactNode;
  onOpenPreview?: (project: PortfolioItem) => void;
  previewProject?: PortfolioItem | null;
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
  dragHandle,
  onOpenPreview,
  previewProject,
}: ResumeCardProps) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const hasResume = Boolean(url);
  const hasThumbnail = Boolean(thumbnailUrl);
  const resumeTitle = getResumeDisplayName({ fileName, url });
  const isPdf =
    (fileName?.toLowerCase().endsWith('.pdf') ?? false) ||
    (url?.toLowerCase().includes('.pdf') ?? false);
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
          ...(hasResume ? CANDY_BLUEY : CANDY_HAZARD),
          width: '100%',
          maxWidth: { xs: '100%', sm: 360 },
          minHeight: { xs: 200, md: 220 },
          height: { xs: 200, md: 220 },
          borderRadius: 3,
          scrollSnapAlign: 'start',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <>
          {hasThumbnail ? (
            <Box
              sx={{
                width: '100%',
                minHeight: { xs: 72, sm: 80 },
                aspectRatio: '16 / 9',
                maxHeight: { xs: 88, md: 100 },
                flexShrink: 0,
                overflow: 'hidden',
                bgcolor: 'rgba(0,0,0,0.5)',
                borderBottom: '1px solid rgba(156,187,217,0.18)',
              }}
            >
              <Box
                component="img"
                src={thumbnailUrl ?? ''}
                alt="Resume thumbnail preview"
                width={400}
                height={300}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top',
                  display: 'block',
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                minHeight: { xs: 72, sm: 80 },
                aspectRatio: '16 / 9',
                maxHeight: { xs: 88, md: 100 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(156,187,217,0.18)',
                px: 1,
              }}
              aria-hidden="true"
            >
              {isPdf ? (
                <PictureAsPdfIcon
                  sx={{ fontSize: 40, color: 'rgba(255,255,255,0.7)' }}
                  aria-hidden
                />
              ) : (
                <DescriptionIcon
                  sx={{ fontSize: 40, color: 'rgba(255,255,255,0.7)' }}
                  aria-hidden
                />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: '100%',
                }}
              >
                {resumeTitle}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              p: { xs: 1.25, md: 1.75 },
              pb: { xs: 1.5, md: 2 },
              flexGrow: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Error message when preview fails */}
            {thumbnailStatus === 'failed' && thumbnailError && (
              <Box
                sx={{
                  mb: 1,
                  p: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 132, 132, 0.1)',
                  border: '1px solid rgba(255, 132, 132, 0.3)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'error.main',
                    fontSize: '0.75rem',
                    display: 'block',
                  }}
                >
                  {errorSuggestsUnsupported
                    ? 'Preview not available for this file type. Open the document directly.'
                    : 'Preview failed. Open the document directly.'}
                </Typography>
              </Box>
            )}
            <Box component="p" sx={{ m: 0, mb: 1.1 }}>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Title:{' '}
              </Typography>
              <Tooltip title={resumeTitle} placement="top">
                <Typography
                  component="span"
                  fontWeight={600}
                  data-testid="resume-file-name"
                  aria-label={resumeTitle}
                  title={resumeTitle}
                  tabIndex={0}
                  sx={{
                    letterSpacing: 0.4,
                    lineHeight: 1.3,
                    fontSize: '0.875rem',
                    color: 'inherit',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    '&:focus-visible': {
                      outline: '2px solid rgba(144, 202, 249, 0.9)',
                      outlineOffset: 2,
                      borderRadius: 1,
                    },
                  }}
                >
                  {resumeTitle}
                </Typography>
              </Tooltip>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              {showRetry && (
                <Tooltip title="Retry preview">
                  <span>
                    <Button
                      variant="text"
                      size="small"
                      sx={{ color: 'inherit' }}
                      disabled={retryThumbnailBusy}
                      onClick={() => {
                        if (onRetryThumbnail) {
                          onRetryThumbnail();
                        }
                      }}
                    >
                      {retryThumbnailBusy ? 'Retrying…' : 'Retry Preview'}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
        </>
        {url != null && (
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.5,
              px: 1.25,
              pt: 1.25,
              pb: 0.75,
              minHeight: 40,
              borderTop: '1px solid rgba(156,187,217,0.18)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minHeight: 28,
              }}
            >
              {dragHandle}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minHeight: 28,
                ml: 'auto',
              }}
            >
              <Tooltip title="Open document">
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  {onOpenPreview && previewProject ? (
                    <IconButton
                      size="small"
                      aria-label="Open document"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPreview(previewProject);
                      }}
                      sx={{
                        bgcolor: 'transparent',
                        minWidth: 32,
                        width: 32,
                        height: 32,
                        padding: 0,
                        color: '#b9c3dd',
                        border: '1px solid rgba(141,188,229,0.48)',
                        borderRadius: 1,
                        '& .MuiSvgIcon-root': { fontSize: '1rem' },
                        '&:hover': {
                          bgcolor: 'rgba(0,196,204,0.22)',
                          color: '#ecfeff',
                          borderColor: 'rgba(0,196,204,0.65)',
                        },
                      }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      component="a"
                      href={url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      aria-label="Open document"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: 'transparent',
                        minWidth: 32,
                        width: 32,
                        height: 32,
                        padding: 0,
                        color: '#b9c3dd',
                        border: '1px solid rgba(141,188,229,0.48)',
                        borderRadius: 1,
                        '& .MuiSvgIcon-root': { fontSize: '1rem' },
                        '&:hover': {
                          bgcolor: 'rgba(0,196,204,0.22)',
                          color: '#ecfeff',
                          borderColor: 'rgba(0,196,204,0.65)',
                        },
                      }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Tooltip>
              {onDelete && (
                <Tooltip title="Delete resume">
                  <IconButton
                    size="small"
                    onClick={handleDeleteClick}
                    disabled={deleteBusy || retryThumbnailBusy}
                    aria-label="Delete resume"
                    sx={{
                      bgcolor: 'transparent',
                      minWidth: 32,
                      width: 32,
                      height: 32,
                      padding: 0,
                      color: '#fbc7c7',
                      border: '1px solid rgba(255,132,132,0.35)',
                      borderRadius: 1,
                      '& .MuiSvgIcon-root': { fontSize: '1rem' },
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
          </Box>
        )}
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
