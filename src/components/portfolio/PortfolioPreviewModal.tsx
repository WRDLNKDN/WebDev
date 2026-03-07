/**
 * Portfolio item preview modal: type-specific preview, Open in new tab, Copy link.
 * Error states: unsupported type, not public, embed blocked, temporary failure.
 */
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  getLinkType,
  getLinkTypeLabel,
  normalizeGoogleUrl,
} from '../../lib/portfolio/linkUtils';
import type { PortfolioItem } from '../../types/portfolio';

const GLASS_MODAL = {
  bgcolor: '#141414',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 2,
  color: 'white',
  overflow: 'hidden',
  backdropFilter: 'blur(18px)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
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

  useEffect(() => {
    if (open) setPreviewError(null);
  }, [open, project?.id, url]);

  const renderPreview = () => {
    if (!url) return null;
    if (linkType === 'unsupported') {
      return (
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="inherit" />}
          sx={{
            mt: 1,
            borderRadius: 1,
            bgcolor: 'rgba(13, 87, 101, 0.22)',
            border: '1px solid rgba(45, 212, 191, 0.35)',
            color: '#d6fbf6',
            '& .MuiAlert-icon': { color: '#2dd4bf' },
          }}
        >
          {ERROR_MESSAGES.unsupported}
        </Alert>
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
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
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
              Open in new tab
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              endIcon={<OpenInNewIcon />}
              disabled
              sx={{
                mt: 1.5,
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Open in new tab
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
    >
      <DialogTitle
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          py: 1.5,
          px: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" noWrap>
              {project?.title ?? 'Preview'}
            </Typography>
            <Chip
              label={typeLabel}
              size="small"
              sx={{
                mt: 0.75,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.08)',
                color: 'text.secondary',
              }}
            />
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {openUrl ? (
              <IconButton
                size="small"
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in new tab"
                sx={{
                  color: 'text.secondary',
                  border: '1px solid rgba(255,255,255,0.24)',
                  borderRadius: 1,
                  '&:hover': {
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.45)',
                    bgcolor: 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                aria-label="Open in new tab"
                disabled
                sx={{
                  color: 'text.disabled',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 1,
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close preview"
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 1.5, md: 2 } }}>
        {project?.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 1,
              px: 1.25,
              py: 1,
              bgcolor: 'rgba(255,255,255,0.02)',
            }}
          >
            {project.description}
          </Typography>
        )}
        {Array.isArray(project?.tech_stack) &&
          project.tech_stack.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              {project.tech_stack
                .map((tag) => String(tag).trim())
                .filter(Boolean)
                .slice(0, 8)
                .map((tag) => (
                  <Chip
                    key={`preview-tag-${tag}`}
                    label={tag}
                    size="small"
                    sx={{
                      borderRadius: 1,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      color: 'text.secondary',
                      border: '1px solid rgba(255,255,255,0.16)',
                    }}
                  />
                ))}
            </Box>
          )}
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
};
