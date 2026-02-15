import DeleteIcon from '@mui/icons-material/Delete';
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
}

export const ProjectCard = ({
  project,
  isOwner,
  onDelete,
}: ProjectCardProps) => {
  const url = project.project_url?.trim() ?? '';
  const external = url && isExternalUrl(url);

  return (
    <Paper
      sx={{
        ...CANDY_BLUEY, // Spread first to ensure brand base
        width: '100%',
        maxWidth: 360,
        minHeight: { xs: 320, md: 400 },
        height: { xs: 320, md: 400 },
        borderRadius: 3,
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {isOwner && onDelete && (
        <IconButton
          size="small"
          aria-label={`Remove project ${project.title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onDelete(project.id);
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            '&:hover': { bgcolor: 'error.main', color: 'white' },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
      <Box
        sx={{
          height: { xs: 140, md: 200 },
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
            }}
          >
            <Typography variant="caption">No image</Typography>
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
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<OpenInNewIcon />}
              sx={{ alignSelf: 'flex-start', color: 'inherit', opacity: 0.8 }}
            >
              View Project
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to={url}
              size="small"
              sx={{ alignSelf: 'flex-start', color: 'inherit', opacity: 0.8 }}
            >
              View Project
            </Button>
          ))}
      </Box>
    </Paper>
  );
};
