/**
 * Portfolio item preview modal: type-specific preview with explicit Download/Open actions.
 * Error states: unsupported type, not public, embed blocked, temporary failure.
 */
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { PortfolioPreviewDialogHeader } from '../preview/PortfolioPreviewDialogHeader';
import { PortfolioPreviewMeta } from '../preview/PortfolioPreviewMeta';
import {
  getLinkType,
  getLinkTypeLabel,
  normalizeGoogleUrl,
} from '../../../lib/portfolio/linkUtils';
import type { PortfolioItem } from '../../../types/portfolio';

const GLASS_MODAL = {
  bgcolor: '#1a1a1d',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 2.5,
  color: 'white',
  overflow: 'hidden',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
  margin: '32px auto',
  maxHeight: 'calc(100vh - 64px)',
  display: 'flex',
  flexDirection: 'column',
};

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
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);
  const url = project?.project_url?.trim() ?? '';
  const linkType = url ? getLinkType(url) : 'unsupported';
  const typeLabel = getLinkTypeLabel(linkType);
  const embedUrl =
    project?.embed_url ||
    (linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides'
      ? normalizeGoogleUrl(url)
      : url);
  const openUrl = (() => {
    const raw = url.trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\/\//.test(raw)) return `https:${raw}`;
    // Support legacy values missing protocol: example.com/path
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(raw))
      return `https://${raw}`;
    return '';
  })();
  const canPreviewInline =
    linkType === 'image' ||
    linkType === 'pdf' ||
    linkType === 'google_doc' ||
    linkType === 'google_sheet' ||
    linkType === 'google_slides';

  useEffect(() => {
    if (open) setPreviewError(null);
  }, [open, project?.id, url]);

  const renderPreview = () => {
    if (!url) return null;
    if (linkType === 'unsupported') {
      return (
        <Box
          sx={{
            mt: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
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
          sx={{
            mt: 1,
            py: 4,
            px: 2,
            textAlign: 'center',
            borderRadius: 1,
            border: '1px solid rgba(255,255,255,0.16)',
            bgcolor: 'rgba(255,255,255,0.03)',
          }}
        >
          <Typography color="text.secondary" gutterBottom>
            {ERROR_MESSAGES[previewError]}
          </Typography>
          {openUrl ? (
            <Button
              variant="contained"
              size="small"
              href={openUrl}
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
          src={url}
          alt={project?.title ?? 'Preview'}
          onError={() => setPreviewError('temporary')}
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
          src={`${url}#toolbar=0&navpanes=0`}
          title={project?.title ?? 'PDF preview'}
          onError={() => setPreviewError('temporary')}
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
          src={embedUrl}
          title={project?.title ?? typeLabel}
          onError={() => setPreviewError('embed_blocked')}
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
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: GLASS_MODAL }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(6, 10, 20, 0.72)',
        },
      }}
      sx={{ '& .MuiDialog-container': { alignItems: 'center' } }}
    >
      <PortfolioPreviewDialogHeader
        title={project?.title ?? 'Preview'}
        typeLabel={typeLabel}
        openUrl={openUrl}
        downloadUrl={openUrl}
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
        {canPreviewInline || previewError ? (
          renderPreview()
        ) : (
          <Box
            sx={{
              mt: 1,
              py: 4,
              px: 2,
              textAlign: 'center',
              borderRadius: 1,
              border: '1px solid rgba(255,255,255,0.16)',
              bgcolor: 'rgba(255,255,255,0.03)',
            }}
          >
            <Typography color="text.secondary" gutterBottom>
              This artifact cannot be previewed in-browser. Download to open it.
            </Typography>
            {openUrl ? (
              <Button
                variant="contained"
                size="small"
                href={openUrl}
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
