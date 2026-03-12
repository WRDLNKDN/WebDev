import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Chip,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

type PortfolioPreviewDialogHeaderProps = {
  title: string;
  typeLabel: string;
  openUrl: string;
  downloadUrl: string;
  onClose: () => void;
};

export const PortfolioPreviewDialogHeader = ({
  title,
  typeLabel,
  openUrl,
  downloadUrl,
  onClose,
}: PortfolioPreviewDialogHeaderProps) => {
  return (
    <DialogTitle
      component="div"
      sx={{
        borderBottom: '1px solid rgba(156,187,217,0.22)',
        py: 1.5,
        px: { xs: 2, md: 2.5 },
        flexShrink: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              borderRadius: 1,
              bgcolor: 'rgba(156,187,217,0.18)',
              color: 'text.secondary',
              border: '1px solid rgba(156,187,217,0.26)',
              fontWeight: 500,
            }}
          />
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
          {downloadUrl ? (
            <Tooltip title="Download">
              <IconButton
                size="small"
                href={downloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download artifact"
                sx={{
                  color: '#b9c3dd',
                  border: '1px solid rgba(141,188,229,0.48)',
                  borderRadius: 1,
                  width: 32,
                  height: 32,
                  '&:hover': {
                    color: '#ecfeff',
                    borderColor: 'rgba(0,196,204,0.65)',
                    bgcolor: 'rgba(0,196,204,0.22)',
                  },
                }}
              >
                <DownloadIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {openUrl ? (
            <Tooltip title="Open in new tab">
              <IconButton
                size="small"
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in new tab"
                sx={{
                  color: '#b9c3dd',
                  border: '1px solid rgba(141,188,229,0.48)',
                  borderRadius: 1,
                  width: 32,
                  height: 32,
                  '&:hover': {
                    color: '#ecfeff',
                    borderColor: 'rgba(0,196,204,0.65)',
                    bgcolor: 'rgba(0,196,204,0.22)',
                  },
                }}
              >
                <OpenInNewIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Open in new tab">
              <span>
                <IconButton
                  size="small"
                  aria-label="Open in new tab"
                  disabled
                  sx={{
                    color: 'text.disabled',
                    border: '1px solid rgba(156,187,217,0.32)',
                    borderRadius: 1,
                    width: 32,
                    height: 32,
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Close preview">
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close preview"
              sx={{
                color: '#b9c3dd',
                border: '1px solid rgba(141,188,229,0.48)',
                borderRadius: 1,
                width: 32,
                height: 32,
                '&:hover': {
                  color: 'white',
                  bgcolor: 'rgba(156,187,217,0.18)',
                  borderColor: 'rgba(255,255,255,0.4)',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </DialogTitle>
  );
};
