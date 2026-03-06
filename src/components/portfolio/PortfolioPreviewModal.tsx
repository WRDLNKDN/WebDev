/**
 * Portfolio item preview modal: type-specific preview, Open in new tab, Copy link.
 * Error states: unsupported type, not public, embed blocked, temporary failure.
 */
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
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

  const handleCopyLink = useCallback(() => {
    if (!url) return;
    void navigator.clipboard.writeText(url);
  }, [url]);

  const renderPreview = () => {
    if (!url) return null;
    if (linkType === 'unsupported') {
      return (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {ERROR_MESSAGES.unsupported}
        </Typography>
      );
    }
    if (previewError) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" gutterBottom>
            {ERROR_MESSAGES[previewError]}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
            sx={{ mt: 1 }}
          >
            Open in new tab
          </Button>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" noWrap>
            {project?.title ?? 'Preview'}
          </Typography>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              mt: 0.5,
              bgcolor: 'rgba(255,255,255,0.08)',
              color: 'text.secondary',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Button
            size="small"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            variant="outlined"
          >
            Open in new tab
          </Button>
          <IconButton
            size="small"
            onClick={handleCopyLink}
            aria-label="Copy link"
            sx={{ color: 'text.secondary' }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        {project?.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
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
