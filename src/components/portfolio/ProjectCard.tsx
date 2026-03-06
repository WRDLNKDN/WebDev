import DeleteIcon from '@mui/icons-material/Delete';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getLinkType } from '../../lib/portfolio/linkUtils';
import { CANDY_BLUEY } from '../../theme/candyStyles';
import type { PortfolioItem } from '../../types/portfolio';

/** True if URL is external (http/https). Internal paths start with / but not //. */
function isExternalUrl(url: string): boolean {
  const t = url.trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

interface ProjectCardProps {
  project: PortfolioItem;
  /** When true, show delete button and call onDelete when removed */
  isOwner?: boolean;
  onDelete?: (projectId: string) => void | Promise<void>;
  /** When provided, clicking the card/title opens this preview instead of navigating to project page */
  onOpenPreview?: (project: PortfolioItem) => void;
  /** When provided, shown as drag handle and arrow controls are hidden (reorder via DnD/keyboard on handle) */
  dragHandle?: React.ReactNode;
  /** Only used when dragHandle is not provided: move up/down callbacks for arrow buttons */
  onMoveUp?: (projectId: string) => void;
  onMoveDown?: (projectId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const ProjectCard = ({
  project,
  isOwner,
  onDelete,
  onOpenPreview,
  dragHandle,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: ProjectCardProps) => {
  const showArrowControls =
    !dragHandle && (onMoveUp != null || onMoveDown != null);
  const url = project.project_url?.trim() ?? '';
  const external = url && isExternalUrl(url);
  const openPreview = () => onOpenPreview?.(project);
  const linkType = url ? getLinkType(url) : 'unsupported';
  const resolvedType = (project.resolved_type as string) || linkType;
  // Step 2 + Step 3: manual image > server-generated thumbnail > image URL > fallback
  const hasManualImage = Boolean(project.image_url);
  const thumbnailUrl = hasManualImage
    ? project.image_url
    : project.thumbnail_url || (resolvedType === 'image' ? url : null);
  const thumbnailPending =
    !hasManualImage && project.thumbnail_status === 'pending';
  const thumbnailFailed =
    !hasManualImage && project.thumbnail_status === 'failed';
  const showThumbnailSkeleton = thumbnailPending && !thumbnailUrl;
  const showFallbackIcon =
    thumbnailFailed || (!thumbnailUrl && !showThumbnailSkeleton);
  const ctaSx = {
    alignSelf: 'flex-start',
    color: 'inherit',
    borderColor: 'currentColor',
    textTransform: 'none',
    fontWeight: 600,
  } as const;
  const categories = (project.tech_stack ?? [])
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Paper
      {...(onOpenPreview ? { component: 'div' as const } : {})}
      role={onOpenPreview ? 'button' : undefined}
      tabIndex={onOpenPreview ? 0 : undefined}
      onClick={
        onOpenPreview
          ? (e) => {
              if (!(e.target as HTMLElement).closest('a, button'))
                openPreview();
            }
          : undefined
      }
      onKeyDown={
        onOpenPreview
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPreview();
              }
            }
          : undefined
      }
      sx={{
        ...CANDY_BLUEY, // Spread first to ensure brand base (compact for Dashboard)
        width: '100%',
        maxWidth: 240,
        minHeight: { xs: 160, md: 200 },
        height: { xs: 160, md: 200 },
        borderRadius: 3,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...(onOpenPreview ? { cursor: 'pointer' } : {}),
      }}
    >
      {isOwner && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: dragHandle ? 8 : undefined,
            right: 8,
            zIndex: 1,
            display: 'flex',
            gap: 0.75,
            alignItems: 'center',
          }}
        >
          {dragHandle}
          {showArrowControls && onMoveUp && (
            <IconButton
              size="small"
              aria-label={`Move project ${project.title} up`}
              disabled={!canMoveUp}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveUp(project.id);
              }}
              sx={{
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
              }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          )}
          {showArrowControls && onMoveDown && (
            <IconButton
              size="small"
              aria-label={`Move project ${project.title} down`}
              disabled={!canMoveDown}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveDown(project.id);
              }}
              sx={{
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.78)' },
              }}
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              size="small"
              aria-label={`Remove project ${project.title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void onDelete(project.id);
              }}
              sx={{
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'white',
                '&:hover': { bgcolor: 'error.main', color: 'white' },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '16 / 9',
          bgcolor: 'rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {thumbnailUrl ? (
          <Box
            component="img"
            src={thumbnailUrl}
            alt={project.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : showThumbnailSkeleton ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              p: 2,
              bgcolor: 'rgba(0,0,0,0.25)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-hidden
          >
            <Box
              sx={{
                width: '60%',
                height: '50%',
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.08)',
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, textAlign: 'center' }}
            >
              Thumbnail generating…
            </Typography>
          </Box>
        ) : showFallbackIcon ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              p: 2,
              bgcolor: 'rgba(0,0,0,0.25)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-hidden
          >
            <ImageNotSupportedOutlinedIcon
              sx={{
                fontSize: 40,
                color: 'text.secondary',
                opacity: 0.7,
                mb: 1,
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: 'center' }}
            >
              Preview unavailable
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          p: { xs: 2, md: 3 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {onOpenPreview ? (
          <Typography
            variant="h6"
            fontWeight={700}
            noWrap
            component="span"
            sx={{
              color: 'inherit',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {project.title}
          </Typography>
        ) : (
          <Typography
            component={RouterLink}
            to={`/projects/${project.id}`}
            variant="h6"
            fontWeight={700}
            noWrap
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {project.title}
          </Typography>
        )}
        {categories.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mb: 1,
            }}
          >
            {categories.map((tag) => (
              <Chip
                key={`${project.id}-tag-${tag}`}
                size="small"
                label={tag}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: 'text.secondary',
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            ))}
          </Box>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            flexGrow: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            userSelect: 'text',
          }}
        >
          {project.description ?? ''}
        </Typography>

        {url &&
          (external ? (
            <Button
              variant="outlined"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<OpenInNewIcon />}
              sx={ctaSx}
              onClick={(e) => e.stopPropagation()}
            >
              View Project
            </Button>
          ) : (
            <Button
              variant="outlined"
              component={RouterLink}
              to={url}
              size="small"
              sx={ctaSx}
              onClick={(e) => e.stopPropagation()}
            >
              View Project
            </Button>
          ))}
      </Box>
    </Paper>
  );
};
