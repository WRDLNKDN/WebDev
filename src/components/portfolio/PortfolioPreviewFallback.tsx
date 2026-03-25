import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { getProjectResolvedType } from '../../lib/portfolio/projectPreview';
import type { PortfolioItem } from '../../types/portfolio';

const getIcon = (project: PortfolioItem) => {
  switch (getProjectResolvedType(project)) {
    case 'image':
      return ImageOutlinedIcon;
    case 'pdf':
      return PictureAsPdfOutlinedIcon;
    case 'document':
    case 'text':
    case 'google_doc':
      return DescriptionOutlinedIcon;
    case 'presentation':
    case 'google_slides':
      return SlideshowOutlinedIcon;
    case 'spreadsheet':
    case 'google_sheet':
      return TableChartOutlinedIcon;
    case 'video':
      return MovieOutlinedIcon;
    default:
      return LinkOutlinedIcon;
  }
};

const DEFAULT_FALLBACK_SUBTITLE = 'Open the preview to view or download.';

export const PortfolioPreviewFallback = ({
  project,
  label,
  compact = false,
  subtitle = DEFAULT_FALLBACK_SUBTITLE,
}: {
  project: PortfolioItem;
  label: string;
  compact?: boolean;
  /** Shown under the label; avoids empty “no image” style messaging. */
  subtitle?: string;
}) => {
  const Icon = getIcon(project);
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={compact ? 0.5 : 0.9}
      sx={{
        width: '100%',
        height: '100%',
        px: compact ? 1.5 : 3,
        textAlign: 'center',
        color: 'text.secondary',
        background:
          'radial-gradient(circle at top, rgba(56,132,210,0.16), rgba(5,7,15,0.55))',
      }}
    >
      <Box
        sx={{
          width: compact ? 40 : 52,
          height: compact ? 40 : 52,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(56,132,210,0.14)',
          border: '1px solid rgba(156,187,217,0.26)',
        }}
      >
        <Icon sx={{ fontSize: compact ? 22 : 26, color: 'text.primary' }} />
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.primary' }}
      >
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    </Stack>
  );
};
