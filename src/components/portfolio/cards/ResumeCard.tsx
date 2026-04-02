import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { AssetThumbnail } from '../../media/AssetThumbnail';
import { MediaStatusBanner } from '../../media/MediaStatusBanner';
import {
  createNormalizedAsset,
  createNormalizedResumeAsset,
} from '../../../lib/media/assets';
import { RESUME_PREVIEW_UNSUPPORTED_MESSAGE } from '../../../lib/portfolio/resumePreviewSupport';
import { CANDY_BLUEY, CANDY_HAZARD } from '../../../theme/candyStyles';
import type { PortfolioItem } from '../../../types/portfolio';
import { computeResumeCardUiState } from './resumeCardUi';

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
  /** Dashboard: replace PDF/Word without deleting the resume slot (metadata merged on save). */
  onEditReplaceResume?: (file: File) => void | Promise<void>;
  /** Dashboard: custom card preview image (JPEG/PNG/WebP/GIF). */
  onEditUploadThumbnail?: (file: File) => void | Promise<void>;
  /** Dashboard: re-run server preview from the current document (PDF/Word). */
  onEditRegenerateThumbnail?: () => void | Promise<void>;
  editBusy?: boolean;
}

const ResumeCardThumbnailArea = ({
  url,
  hasThumbnail,
  thumbnailUrl,
  thumbnailStatus,
  isPdf,
  resumeTitle,
}: {
  url?: string | null;
  hasThumbnail: boolean;
  thumbnailUrl?: string | null;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  isPdf: boolean;
  resumeTitle: string;
}) => {
  const asset = createNormalizedResumeAsset({
    url,
    fileName: resumeTitle,
    thumbnailUrl,
    thumbnailStatus,
  });

  if (asset) {
    return (
      <AssetThumbnail
        asset={asset}
        alt={resumeTitle}
        compact
        loadingLabel={
          thumbnailStatus === 'pending' ? 'Generating preview…' : undefined
        }
      />
    );
  }

  if (hasThumbnail) {
    const thumbnailAsset = createNormalizedAsset({
      sourceType: 'upload',
      mediaType: 'image',
      displayUrl: thumbnailUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      title: resumeTitle,
    });

    return (
      <AssetThumbnail
        asset={thumbnailAsset}
        alt="Resume thumbnail preview"
        compact
      />
    );
  }

  if (thumbnailStatus === 'pending') {
    return (
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
          gap: 1,
          bgcolor: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(156,187,217,0.18)',
          px: 1.5,
          position: 'relative',
        }}
        role="status"
        aria-busy="true"
        aria-label="Generating resume preview"
      >
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 0,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.light' },
          }}
        />
        <CircularProgress
          size={28}
          thickness={4}
          sx={{ color: 'primary.light' }}
        />
        {isPdf ? (
          <PictureAsPdfIcon
            sx={{ fontSize: 32, color: 'rgba(255,255,255,0.55)' }}
            aria-hidden
          />
        ) : (
          <DescriptionIcon
            sx={{ fontSize: 32, color: 'rgba(255,255,255,0.55)' }}
            aria-hidden
          />
        )}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            textAlign: 'center',
            fontWeight: 600,
            maxWidth: '100%',
          }}
        >
          Generating preview…
        </Typography>
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
            opacity: 0.9,
          }}
        >
          {resumeTitle}
        </Typography>
      </Box>
    );
  }

  return (
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
      aria-label={`Document preview: ${resumeTitle}`}
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
  );
};

const ResumeCardBodyBlock = ({
  ui,
  thumbnailStatus,
  thumbnailError,
  retryThumbnailBusy,
  onRetryThumbnail,
}: {
  ui: ReturnType<typeof computeResumeCardUiState>;
  thumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  thumbnailError?: string | null;
  retryThumbnailBusy: boolean;
  onRetryThumbnail?: () => void;
}) => {
  const previewStatusState =
    thumbnailStatus === 'pending'
      ? {
          stage: 'converting' as const,
          message:
            'Generating preview files so this resume renders consistently across the platform.',
        }
      : thumbnailStatus === 'failed' && !ui.isWordResume
        ? {
            stage: 'failed' as const,
            message: ui.errorSuggestsUnsupported
              ? RESUME_PREVIEW_UNSUPPORTED_MESSAGE
              : thumbnailError?.trim() ||
                "We couldn't finish generating the preview. Open the document directly or retry.",
            retryable: Boolean(onRetryThumbnail),
          }
        : null;

  return (
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
      {ui.isWordResume && !ui.hasThumbnail && thumbnailStatus !== 'pending' ? (
        <Box
          sx={{
            mb: 1,
            p: 0.75,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              display: 'block',
            }}
          >
            {RESUME_PREVIEW_UNSUPPORTED_MESSAGE}
          </Typography>
        </Box>
      ) : null}
      {previewStatusState ? (
        <MediaStatusBanner
          state={previewStatusState}
          compact
          onRetry={
            previewStatusState.stage === 'failed' ? onRetryThumbnail : undefined
          }
          retryBusy={retryThumbnailBusy}
          sx={{ mb: 1 }}
        />
      ) : null}
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
        <Tooltip title={ui.resumeTitle} placement="top" describeChild>
          <Typography
            component="span"
            fontWeight={600}
            data-testid="resume-file-name"
            aria-label={ui.resumeTitle}
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
            {ui.resumeTitle}
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
        {ui.showRetry && (
          <Tooltip title="Retry preview (fetches a new preview from the server)">
            <span>
              <Button
                variant="text"
                size="small"
                sx={{ color: 'inherit' }}
                disabled={retryThumbnailBusy}
                onClick={() => {
                  if (onRetryThumbnail) {
                    Promise.resolve(onRetryThumbnail()).catch(() => {});
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
  );
};

const ResumeCardUrlFooter = ({
  url,
  dragHandle,
  onOpenPreview,
  previewProject,
  showEdit,
  editBusy,
  deleteBusy,
  retryThumbnailBusy,
  onDelete,
  onEditOpen,
  onDeleteClick,
}: {
  url: string;
  dragHandle?: React.ReactNode;
  onOpenPreview?: (project: PortfolioItem) => void;
  previewProject?: PortfolioItem | null;
  showEdit: boolean;
  editBusy: boolean;
  deleteBusy: boolean;
  retryThumbnailBusy: boolean;
  onDelete?: () => void | Promise<void>;
  onEditOpen: () => void;
  onDeleteClick: () => void;
}) => {
  return (
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
        minHeight: 44,
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
        {showEdit && (
          <Tooltip title="Edit resume">
            <span>
              <IconButton
                size="small"
                onClick={onEditOpen}
                disabled={editBusy || deleteBusy || retryThumbnailBusy}
                aria-label="Edit resume"
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
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete resume">
            <span>
              <IconButton
                size="small"
                onClick={onDeleteClick}
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
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

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
  onEditReplaceResume,
  onEditUploadThumbnail,
  onEditRegenerateThumbnail,
  editBusy = false,
}: ResumeCardProps) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const thumbFileInputRef = useRef<HTMLInputElement>(null);

  const ui = computeResumeCardUiState({
    url,
    fileName,
    thumbnailUrl,
    thumbnailStatus,
    thumbnailError,
    isOwner,
    onRetryThumbnail,
    onEditReplaceResume,
    onEditUploadThumbnail,
    onEditRegenerateThumbnail,
  });

  const handleDeleteClick = () => setConfirmDeleteOpen(true);
  const handleConfirmDelete = async () => {
    if (onDelete) {
      await Promise.resolve(onDelete());
      setConfirmDeleteOpen(false);
    }
  };

  const handleReplaceFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onEditReplaceResume) return;
    try {
      await Promise.resolve(onEditReplaceResume(file));
      setEditOpen(false);
    } catch {
      /* Parent surfaces toast */
    }
  };

  const handleThumbFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onEditUploadThumbnail) return;
    try {
      await Promise.resolve(onEditUploadThumbnail(file));
      setEditOpen(false);
    } catch {
      /* Parent surfaces toast */
    }
  };

  const handleRegenerateClick = async () => {
    if (!onEditRegenerateThumbnail) return;
    try {
      await Promise.resolve(onEditRegenerateThumbnail());
      setEditOpen(false);
    } catch {
      /* Parent surfaces toast */
    }
  };

  if (!ui.hasResume && !isOwner) return null;
  if (!ui.hasResume && isOwner) return null;

  return (
    <>
      <Paper
        sx={{
          ...(ui.hasResume ? CANDY_BLUEY : CANDY_HAZARD),
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
        <ResumeCardThumbnailArea
          url={url}
          hasThumbnail={ui.hasThumbnail}
          thumbnailUrl={thumbnailUrl}
          thumbnailStatus={thumbnailStatus}
          isPdf={ui.isPdf}
          resumeTitle={ui.resumeTitle}
        />
        <ResumeCardBodyBlock
          ui={ui}
          thumbnailStatus={thumbnailStatus}
          thumbnailError={thumbnailError}
          retryThumbnailBusy={retryThumbnailBusy}
          onRetryThumbnail={onRetryThumbnail}
        />
        {url != null && (
          <ResumeCardUrlFooter
            url={url}
            dragHandle={dragHandle}
            onOpenPreview={onOpenPreview}
            previewProject={previewProject}
            showEdit={ui.showEdit}
            editBusy={editBusy}
            deleteBusy={deleteBusy}
            retryThumbnailBusy={retryThumbnailBusy}
            onDelete={onDelete}
            onEditOpen={() => setEditOpen(true)}
            onDeleteClick={handleDeleteClick}
          />
        )}
      </Paper>

      <Dialog
        open={editOpen}
        onClose={() => !editBusy && setEditOpen(false)}
        aria-labelledby="resume-edit-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="resume-edit-dialog-title">Edit resume</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {onEditReplaceResume ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Replace the PDF or Word file. Portfolio order and other
                  settings stay the same.
                </Typography>
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    handleReplaceFileChange(e).catch(() => {});
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={editBusy}
                  onClick={() => replaceFileInputRef.current?.click()}
                >
                  Choose new file
                </Button>
              </>
            ) : null}
            {onEditReplaceResume && onEditUploadThumbnail ? (
              <Divider sx={{ borderColor: 'rgba(156,187,217,0.2)' }} />
            ) : null}
            {onEditUploadThumbnail ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Upload a custom preview image for your resume card (JPEG, PNG,
                  WebP, or GIF).
                </Typography>
                <input
                  ref={thumbFileInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={(e) => {
                    handleThumbFileChange(e).catch(() => {});
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={editBusy}
                  onClick={() => thumbFileInputRef.current?.click()}
                >
                  Upload preview image
                </Button>
              </>
            ) : null}
            {ui.canRegenerateFromDocument ? (
              <>
                {(onEditReplaceResume || onEditUploadThumbnail) && (
                  <Divider sx={{ borderColor: 'rgba(156,187,217,0.2)' }} />
                )}
                <Typography variant="body2" color="text.secondary">
                  Prefer an automatic preview from your document instead? We
                  will replace the current preview image.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={editBusy}
                  onClick={() => {
                    handleRegenerateClick().catch(() => {});
                  }}
                >
                  Regenerate preview from document
                </Button>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editBusy}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
            onClick={() => {
              handleConfirmDelete().catch(() => {});
            }}
            disabled={deleteBusy}
          >
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
