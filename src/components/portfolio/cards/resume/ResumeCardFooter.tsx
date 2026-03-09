import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, IconButton, Tooltip } from '@mui/material';

type ResumeCardFooterProps = {
  dragHandle?: React.ReactNode;
  onOpen?: () => void;
  onDelete?: () => void;
  deleteBusy?: boolean;
  retryThumbnailBusy?: boolean;
};

export const ResumeCardFooter = ({
  dragHandle,
  onOpen,
  onDelete,
  deleteBusy = false,
  retryThumbnailBusy = false,
}: ResumeCardFooterProps) => (
  <Box
    sx={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 0.5,
      px: 1.25,
      pt: 1.25,
      pb: 0.75,
      minHeight: 40,
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 28 }}
    >
      {dragHandle}
    </Box>
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 28 }}
    >
      <Tooltip title="Open document">
        <Box
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <IconButton
            size="small"
            aria-label="Open document"
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
            }}
            sx={{
              bgcolor: 'transparent',
              minWidth: 32,
              width: 32,
              height: 32,
              padding: 0,
              color: '#b9c3dd',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 1,
              '& .MuiSvgIcon-root': { fontSize: '1rem' },
              '&:hover': {
                bgcolor: 'rgba(0,196,204,0.22)',
                color: '#ecfeff',
                borderColor: 'rgba(0,196,204,0.65)',
              },
            }}
            disabled={!onOpen}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Box>
      </Tooltip>
      {onDelete && (
        <Tooltip title="Delete resume">
          <IconButton
            size="small"
            onClick={onDelete}
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
);
