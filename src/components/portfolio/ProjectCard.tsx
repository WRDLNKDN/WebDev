import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import type { SxProps, Theme } from '@mui/material';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import type { KeyboardEvent, MouseEvent } from 'react';
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
  const cardOpensArtifact = isShowcase && Boolean(url) && !onOpenPreview;
  const openPreview = () => onOpenPreview?.(project);
  const openArtifact = () => {
    if (!url) return;
    if (external) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.assign(url);
  };
  const linkType = url ? getLinkType(url) : 'unsupported';
  const resolvedType = (project.resolved_type as string) || linkType;
  const artifactHost = (() => {
    if (!external || !url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  })();
  // Step 2 + Step 3: manual image > server-generated thumbnail > image URL > fallback
  const hasManualImage = Boolean(project.image_url);
  const thumbnailUrl = hasManualImage
    ? project.image_url
    : project.thumbnail_url || (resolvedType === 'image' ? url : null);
  const ownerActionSx = {
    bgcolor: 'transparent',
    color: '#b9c3dd',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: 1,
    minWidth: 32,
    width: 32,
    height: 32,
    padding: 0,
    '& .MuiSvgIcon-root': { fontSize: '1rem' },
    '&:hover': {
      bgcolor: 'rgba(0,196,204,0.22)',
      color: '#ecfeff',
      borderColor: 'rgba(0,196,204,0.65)',
    },
  } as const;
  const categories = (project.tech_stack ?? [])
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Paper
      {...(onOpenPreview ? { component: 'div' as const } : {})}
      role={onOpenPreview ? 'button' : cardOpensArtifact ? 'link' : undefined}
      tabIndex={onOpenPreview || cardOpensArtifact ? 0 : undefined}
      onClick={
        onOpenPreview || cardOpensArtifact
          ? (e: MouseEvent<HTMLDivElement>) => {
              if ((e.target as HTMLElement).closest('a, button')) return;
              if (onOpenPreview) {
                openPreview();
                return;
              }
              openArtifact();
            }
          : undefined
      }
      onKeyDown={
        onOpenPreview || cardOpensArtifact
          ? (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onOpenPreview) {
                  openPreview();
                  return;
                }
                openArtifact();
              }
            }
          : undefined
      }
      sx={
        [
          CANDY_BLUEY,
          {
            width: '100%',
            maxWidth: isShowcase ? 'none' : { xs: '100%', sm: 360 },
            minHeight: isShowcase ? { xs: 0, md: 0 } : undefined,
            height: isShowcase ? '100%' : undefined,
            borderRadius: 3,
            scrollSnapAlign: 'start',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...(onOpenPreview ? { cursor: 'pointer' as const } : {}),
          },
        ] as SxProps<Theme>
      }
    >
      {thumbnailUrl ? (
        <Box
          sx={{
            width: '100%',
            minHeight: { xs: 72, sm: 80 },
            aspectRatio: '16 / 9',
            maxHeight: { xs: 88, md: 100 },
            flexShrink: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Box
            component="img"
            src={thumbnailUrl}
            alt={project.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
      ) : null}
      {!thumbnailUrl && !isShowcase ? (
        <Box
          sx={{
            minHeight: { xs: 72, sm: 80 },
            maxHeight: { xs: 88, md: 100 },
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            No image
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          p: isShowcase
            ? { xs: 1.75, sm: 2.25, md: 2.75 }
            : { xs: 1.25, md: 1.75 },
          flexGrow: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box component="p" sx={{ m: 0, mb: 1.1, lineHeight: 1.25 }}>
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
          {onOpenPreview || cardOpensArtifact ? (
            <Typography
              variant="h6"
              component="span"
              fontWeight={700}
              noWrap={!isShowcase}
              sx={{
                color: 'inherit',
                letterSpacing: 0.5,
                display: isShowcase ? '-webkit-box' : 'inline',
                WebkitLineClamp: isShowcase ? { xs: 2, md: 1 } : undefined,
                WebkitBoxOrient: isShowcase ? 'vertical' : undefined,
                overflow: 'hidden',
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
              noWrap={!isShowcase}
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                letterSpacing: 0.5,
                display: isShowcase ? '-webkit-box' : 'inline',
                WebkitLineClamp: isShowcase ? { xs: 2, md: 1 } : undefined,
                WebkitBoxOrient: isShowcase ? 'vertical' : undefined,
                overflow: 'hidden',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {project.title}
            </Typography>
          )}
        </Box>
        {(categories.length > 0 || project.is_highlighted) && (
          <Box
            component="p"
            sx={{
              m: 0,
              mb: 1.4,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              gap: 0.5,
            }}
          >
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
              Tags:{' '}
            </Typography>
            {project.is_highlighted && (
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  bgcolor: 'rgba(125,42,232,0.12)',
                  color: '#d7b7ff',
                }}
              >
                Highlight
              </Box>
            )}
            {categories.map((tag) => (
              <Box
                key={`${project.id}-tag-${tag}`}
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  bgcolor: 'rgba(255,255,255,0.06)',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
              </Box>
            ))}
          </Box>
        )}
        {isShowcase && (resolvedType || artifactHost) ? (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1.2,
              color: 'text.secondary',
              letterSpacing: 0.2,
            }}
          >
            {[resolvedType, artifactHost].filter(Boolean).join(' • ')}
          </Typography>
        ) : null}
        <Box component="p" sx={{ m: 0, mb: 1.5, flexGrow: 1 }}>
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
            Description:{' '}
          </Typography>
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{
              letterSpacing: 0.4,
              display: '-webkit-box',
              WebkitLineClamp: isShowcase ? 4 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              userSelect: 'text',
              lineHeight: 1.55,
            }}
          >
            {project.description ?? ''}
          </Typography>
        </Box>
      </Box>
      {url != null && (
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.5,
            px: 1.25,
            py: 0.75,
            minHeight: 40,
            borderTop: '1px solid rgba(255,255,255,0.08)',
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
            }}
          >
            <Tooltip title="Open project">
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'center' }}
              >
                {external ? (
                  <IconButton
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    aria-label="Open project"
                    onClick={(e) => e.stopPropagation()}
                    sx={ownerActionSx}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton
                    component={RouterLink}
                    to={url}
                    size="small"
                    aria-label="Open project"
                    onClick={(e) => e.stopPropagation()}
                    sx={ownerActionSx}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Tooltip>
            {isOwner && showArrowControls && onMoveUp && (
              <Tooltip title="Move up">
                <span>
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
                </span>
              </Tooltip>
            )}
            {showArrowControls && onMoveDown && (
              <Tooltip title="Move down">
                <span>
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
                </span>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title="Edit project">
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
              </Tooltip>
            )}
            {onToggleHighlight && (
              <Tooltip
                title={
                  project.is_highlighted
                    ? 'Remove from highlights'
                    : 'Add to highlights'
                }
              >
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
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete project">
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
              </Tooltip>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};
