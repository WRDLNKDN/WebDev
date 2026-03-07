import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
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
  variant?: 'compact' | 'showcase';
  /** When true, show delete button and call onDelete when removed */
  isOwner?: boolean;
  onEdit?: (project: PortfolioItem) => void | Promise<void>;
  onDelete?: (projectId: string) => void | Promise<void>;
  onToggleHighlight?: (
    projectId: string,
    isHighlighted: boolean,
  ) => void | Promise<void>;
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
  variant = 'compact',
  isOwner,
  onEdit,
  onDelete,
  onToggleHighlight,
  onOpenPreview,
  dragHandle,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: ProjectCardProps) => {
  const isShowcase = variant === 'showcase';
  const showArrowControls = onMoveUp != null || onMoveDown != null;
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
  const ownerActionSx = {
    bgcolor: 'transparent',
    color: '#b9c3dd',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 1,
    '&:hover': {
      bgcolor: 'rgba(0,196,204,0.22)',
      color: '#ecfeff',
      borderColor: 'rgba(0,196,204,0.65)',
    },
  } as const;
  const ctaSx = {
    alignSelf: 'stretch',
    justifyContent: 'center',
    color: 'white',
    borderColor: 'transparent',
    background: 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
    textTransform: 'none',
    fontWeight: 800,
    letterSpacing: 0.3,
    fontSize: '0.9rem',
    borderRadius: 1,
    minHeight: 40,
    px: 1.8,
    py: 0.7,
    boxShadow: '0 8px 20px rgba(20,184,166,0.28)',
    '&:hover': {
      color: 'white',
      borderColor: 'transparent',
      background: 'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)',
      boxShadow: '0 12px 28px rgba(20,184,166,0.4)',
    },
    '&:active': {
      transform: 'translateY(1px)',
    },
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
        maxWidth: isShowcase ? 'none' : { xs: '100%', sm: 320 },
        minHeight: isShowcase ? { xs: 0, md: 0 } : { xs: 240, md: 280 },
        height: isShowcase ? '100%' : { xs: 240, md: 280 },
        borderRadius: 3,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        ...(onOpenPreview ? { cursor: 'pointer' } : {}),
      }}
    >
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
          p: isShowcase
            ? { xs: 1.75, sm: 2.25, md: 2.75 }
            : { xs: 2.25, md: 3.25 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isOwner && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              mb: 1.5,
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
                sx={ownerActionSx}
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
                sx={ownerActionSx}
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            )}
            {onEdit && (
              <IconButton
                size="small"
                aria-label={`Edit project ${project.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onEdit(project);
                }}
                sx={ownerActionSx}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {onToggleHighlight && (
              <IconButton
                size="small"
                aria-label={
                  project.is_highlighted
                    ? `Remove artifact ${project.title} from highlights`
                    : `Mark artifact ${project.title} as highlight`
                }
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onToggleHighlight(project.id, !project.is_highlighted);
                }}
                sx={{
                  ...ownerActionSx,
                  color: project.is_highlighted
                    ? '#f8df95'
                    : ownerActionSx.color,
                  border: project.is_highlighted
                    ? '1px solid rgba(248, 223, 149, 0.42)'
                    : ownerActionSx.border,
                  '&:hover': project.is_highlighted
                    ? {
                        bgcolor: 'rgba(248, 223, 149, 0.18)',
                        color: '#ffefba',
                        borderColor: 'rgba(248, 223, 149, 0.7)',
                      }
                    : ownerActionSx['&:hover'],
                }}
              >
                {project.is_highlighted ? (
                  <StarIcon fontSize="small" />
                ) : (
                  <StarBorderIcon fontSize="small" />
                )}
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
                  ...ownerActionSx,
                  color: '#fbc7c7',
                  border: '1px solid rgba(255,132,132,0.35)',
                  '&:hover': {
                    bgcolor: 'rgba(255,77,77,0.25)',
                    color: '#ffe5e5',
                    borderColor: 'rgba(255,77,77,0.75)',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
        {onOpenPreview ? (
          <Typography
            variant="h6"
            fontWeight={700}
            noWrap
            component="span"
            sx={{
              color: 'inherit',
              mb: 1.1,
              lineHeight: 1.25,
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
              mb: 1.1,
              lineHeight: 1.25,
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
              gap: 0.6,
              mb: 1.4,
            }}
          >
            {project.is_highlighted ? (
              <Chip
                size="small"
                label="Highlight"
                sx={{
                  bgcolor: 'rgba(125,42,232,0.18)',
                  border: '1px solid rgba(125,42,232,0.4)',
                  color: '#d7b7ff',
                  borderRadius: 1,
                }}
              />
            ) : null}
            {categories.map((tag) => (
              <Chip
                key={`${project.id}-tag-${tag}`}
                size="small"
                label={tag}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: 'text.secondary',
                  borderRadius: 1,
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
        {categories.length === 0 && project.is_highlighted ? (
          <Box sx={{ display: 'flex', mb: 1.4 }}>
            <Chip
              size="small"
              label="Highlight"
              sx={{
                bgcolor: 'rgba(125,42,232,0.18)',
                border: '1px solid rgba(125,42,232,0.4)',
                color: '#d7b7ff',
                borderRadius: 1,
              }}
            />
          </Box>
        ) : null}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2.4,
            flexGrow: 1,
            display: '-webkit-box',
            WebkitLineClamp: isShowcase ? 4 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            userSelect: 'text',
            lineHeight: 1.55,
          }}
        >
          {project.description ?? ''}
        </Typography>

        {url &&
          (external ? (
            <Button
              variant="contained"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              size="medium"
              endIcon={<OpenInNewIcon />}
              sx={ctaSx}
              onClick={(e) => e.stopPropagation()}
            >
              View Project
            </Button>
          ) : (
            <Button
              variant="contained"
              component={RouterLink}
              to={url}
              size="medium"
              endIcon={<OpenInNewIcon />}
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
