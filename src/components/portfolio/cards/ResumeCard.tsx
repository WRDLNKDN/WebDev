import { Box, Button, Paper, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { PortfolioPreviewModal } from '../dialogs/PortfolioPreviewModal';
import { getResumeDisplayName } from '../../../lib/portfolio/resumeDisplayName';
import { CANDY_BLUEY, CANDY_HAZARD } from '../../../theme/candyStyles';
import { ResumeCardFooter } from './resume/ResumeCardFooter';
import { ResumeDeleteDialog } from './resume/ResumeDeleteDialog';
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
}: ResumeCardProps) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasResume = Boolean(url);
  const hasThumbnail = Boolean(thumbnailUrl);
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
  const handleOpenPreview = () => {
    if (!url) return;
    setPreviewOpen(true);
  };
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

  const resumePreviewItem: PortfolioItem | null = url
    ? {
        id: '__resume_preview__',
        owner_id: '',
        title: resumeTitle,
        description: 'Resume artifact',
        image_url: null,
        project_url: url,
        tech_stack: ['resume'],
        created_at: '',
        embed_url: null,
        resolved_type: null,
        thumbnail_url: thumbnailUrl ?? null,
        thumbnail_status: null,
      }
    : null;

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
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Box
                component="img"
                src={thumbnailUrl ?? ''}
                alt="Resume thumbnail preview"
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
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                No image
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
                      onClick={onRetryThumbnail}
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
          <ResumeCardFooter
            dragHandle={dragHandle}
            onOpen={handleOpenPreview}
            onDelete={onDelete ? handleDeleteClick : undefined}
            deleteBusy={deleteBusy}
            retryThumbnailBusy={retryThumbnailBusy}
          />
        )}
      </Paper>

      <ResumeDeleteDialog
        open={confirmDeleteOpen}
        deleteBusy={deleteBusy}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <PortfolioPreviewModal
        project={resumePreviewItem}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};
