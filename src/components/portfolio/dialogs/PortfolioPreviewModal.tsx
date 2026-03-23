/**
 * Portfolio item preview modal: type-specific preview with explicit Download/Open actions.
 * Error states: unsupported type, not public, embed blocked, temporary failure.
 */
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { PortfolioPreviewDialogHeader } from '../preview/PortfolioPreviewDialogHeader';
import { PortfolioPreviewMeta } from '../preview/PortfolioPreviewMeta';
import { getPortfolioPreviewModel } from '../../../lib/portfolio/previewUtils';
import {
  RESUME_PREVIEW_UNSUPPORTED_MESSAGE,
  isSupabasePublicResumeUrl,
} from '../../../lib/portfolio/resumePreviewSupport';
import type { PortfolioItem } from '../../../types/portfolio';

type PreviewError =
  | 'unsupported'
  | 'not_public'
  | 'embed_blocked'
  | 'temporary';

const ERROR_MESSAGES: Record<PreviewError, string> = {
  unsupported: 'This file type is not supported for preview.',
  not_public: 'This link is not publicly accessible.',
  embed_blocked: 'This content cannot be embedded. Open in new tab to view.',
  temporary: 'Preview temporarily unavailable. Try again later.',
};

interface PortfolioPreviewModalProps {
  project: PortfolioItem | null;
  open: boolean;
  onClose: () => void;
}

export const PortfolioPreviewModal = ({
  project,
  open,
  onClose,
}: PortfolioPreviewModalProps) => {
  const theme = useTheme();
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);
  const model = useMemo(() => getPortfolioPreviewModel(project), [project]);
  const {
    kind,
    linkType,
    typeLabel,
    openUrl,
    downloadUrl,
    previewUrl,
    previewable,
  } = model;

  const paperSx = useMemo(
    () => ({
      bgcolor:
        theme.palette.mode === 'light'
          ? theme.palette.background.paper
          : '#1a1a1d',
      border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 1 : 0.28)}`,
      borderRadius: 2.5,
      color: theme.palette.text.primary,
      overflow: 'hidden',
      backdropFilter: 'blur(20px)',
      boxShadow:
        theme.palette.mode === 'light'
          ? `0 24px 48px ${alpha(theme.palette.common.black, 0.12)}`
          : '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(56,132,210,0.14)',
      margin: '32px auto',
      maxHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column' as const,
    }),
    [theme],
  );

  const resumeInlineBlockedCopy =
    !previewable &&
    linkType === 'document' &&
    Boolean(openUrl) &&
    isSupabasePublicResumeUrl(openUrl)
      ? RESUME_PREVIEW_UNSUPPORTED_MESSAGE
      : null;

  useEffect(() => {
    if (open) setPreviewError(null);
  }, [open, project?.id, project?.project_url]);

  const renderPreview = () => {
    if (!openUrl) return null;
    if (linkType === 'unsupported') {
      return (
        <Box
          data-testid="portfolio-preview-fallback"
          sx={{
            mt: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: 'rgba(56,132,210,0.10)',
            border: '1px solid rgba(156,187,217,0.22)',
          }}
        >
          <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            {ERROR_MESSAGES.unsupported}
          </Typography>
        </Box>
      );
    }
    if (previewError) {
      return (
        <Box
          data-testid="portfolio-preview-fallback"
          sx={{
            mt: 1,
            py: 4,
            px: 2,
            textAlign: 'center',
            borderRadius: 1,
            border: '1px solid rgba(156,187,217,0.32)',
            bgcolor: 'rgba(56,132,210,0.08)',
          }}
        >
          <Typography color="text.secondary" gutterBottom>
            {ERROR_MESSAGES[previewError]}
          </Typography>
          {openUrl ? (
            <Button
              variant="contained"
              size="small"
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<DownloadIcon />}
              sx={{
                mt: 1.5,
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 700,
                color: 'white',
                background: 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
                '&:hover': {
                  background:
                    'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                },
              }}
            >
              Download
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              endIcon={<DownloadIcon />}
              disabled
              sx={{
                mt: 1.5,
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Download
            </Button>
          )}
        </Box>
      );
    }
    if (linkType === 'image') {
      return (
        <Box
          component="img"
          src={previewUrl}
          alt={project?.title ?? 'Preview'}
          onError={() => setPreviewError('temporary')}
          data-testid="portfolio-preview-image"
          sx={{
            width: '100%',
            maxHeight: '60vh',
            objectFit: 'contain',
            borderRadius: 1,
          }}
        />
      );
    }
    if (linkType === 'pdf') {
      return (
        <Box
          component="iframe"
          src={previewUrl}
          title={project?.title ?? 'PDF preview'}
          onError={() => setPreviewError('temporary')}
          data-testid="portfolio-preview-frame"
          sx={{
            width: '100%',
            height: '60vh',
            minHeight: 400,
            border: 0,
            borderRadius: 1,
          }}
        />
      );
    }
    if (
      linkType === 'google_doc' ||
      linkType === 'google_sheet' ||
      linkType === 'google_slides'
    ) {
      return (
        <Box
          component="iframe"
          src={previewUrl}
          title={project?.title ?? typeLabel}
          onError={() => setPreviewError('embed_blocked')}
          data-testid="portfolio-preview-frame"
          sx={{
            width: '100%',
            height: '60vh',
            minHeight: 400,
            border: 0,
            borderRadius: 1,
          }}
        />
      );
    }
    if (
      linkType === 'document' ||
      linkType === 'presentation' ||
      linkType === 'spreadsheet'
    ) {
      return (
        <Box
          component="iframe"
          src={previewUrl}
          title={project?.title ?? typeLabel}
          onError={() => setPreviewError('embed_blocked')}
          data-testid="portfolio-preview-frame"
          sx={{
            width: '100%',
            height: '60vh',
            minHeight: 400,
            border: 0,
            borderRadius: 1,
          }}
        />
      );
    }
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        {ERROR_MESSAGES.unsupported}
      </Typography>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      data-testid="portfolio-preview-modal"
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: paperSx }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(6px)',
          backgroundColor:
            theme.palette.mode === 'light'
              ? alpha(theme.palette.common.black, 0.25)
              : 'rgba(6, 10, 20, 0.72)',
        },
      }}
      sx={{ '& .MuiDialog-container': { alignItems: 'center' } }}
    >
      <PortfolioPreviewDialogHeader
        title={project?.title ?? 'Preview'}
        typeLabel={typeLabel}
        openUrl={openUrl}
        downloadUrl={downloadUrl}
        onClose={onClose}
      />
      <DialogContent
        sx={{
          p: { xs: 2, md: 2.5 },
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <PortfolioPreviewMeta project={project} />
        {kind !== 'none' || previewError ? (
          renderPreview()
        ) : (
          <Box
            data-testid="portfolio-preview-fallback"
            sx={{
              mt: 1,
              py: 4,
              px: 2,
              textAlign: 'center',
              borderRadius: 1,
              border: '1px solid rgba(156,187,217,0.32)',
              bgcolor: 'rgba(56,132,210,0.08)',
            }}
          >
            <Typography color="text.secondary" gutterBottom>
              {resumeInlineBlockedCopy ??
                'This artifact cannot be previewed in-browser. Download to open it.'}
            </Typography>
            {openUrl ? (
              <Button
                variant="contained"
                size="small"
                href={downloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<DownloadIcon />}
                sx={{
                  mt: 1.5,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  color: 'white',
                  background:
                    'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
                  '&:hover': {
                    background:
                      'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
                  },
                }}
              >
                Download
              </Button>
            ) : null}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
