import DeleteIcon from '@mui/icons-material/Delete';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, IconButton, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
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
  onMoveUp?: (projectId: string) => void;
  onMoveDown?: (projectId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const ProjectCard = ({
  project,
  isOwner,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: ProjectCardProps) => {
  const url = project.project_url?.trim() ?? '';
  const external = url && isExternalUrl(url);
  const ctaSx = {
    alignSelf: 'flex-start',
    color: 'inherit',
    borderColor: 'currentColor',
    textTransform: 'none',
    fontWeight: 600,
  } as const;

  return (
    <Paper
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
      }}
    >
      {isOwner && onDelete && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            display: 'flex',
            gap: 0.75,
            alignItems: 'center',
          }}
        >
          {onMoveUp && (
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
          {onMoveDown && (
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
        {project.image_url ? (
          <Box
            component="img"
            src={project.image_url}
            alt={project.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
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
        )}
      </Box>

      <Box
        sx={{
          p: { xs: 2, md: 3 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
            >
              View Project
            </Button>
          ))}
      </Box>
    </Paper>
  );
};
