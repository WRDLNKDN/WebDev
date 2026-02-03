import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { CANDY_BLUEY } from '../../theme/candyStyles';
import type { PortfolioItem } from '../../types/portfolio';

interface ProjectCardProps {
  project: PortfolioItem;
}

export const ProjectCard = ({ project }: ProjectCardProps) => (
  <Paper
    sx={{
      ...CANDY_BLUEY, // Spread first to ensure brand base
      minWidth: 320,
      maxWidth: 320,
      height: 400,
      borderRadius: 3,
      scrollSnapAlign: 'start',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Box
      sx={{
        height: 200,
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
          <Typography variant="caption">No Signal</Typography>
        </Box>
      )}
    </Box>

    <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight={700} noWrap>
        {project.title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mb: 2,
          flexGrow: 1,
          opacity: 0.9,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {project.description}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2, overflow: 'hidden' }}>
        {(project.tech_stack || []).slice(0, 3).map((tech) => (
          <Chip
            key={tech}
            label={tech}
            size="small"
            sx={{
              fontSize: '0.7rem',
              bgcolor: 'rgba(255,255,255,0.1)',
              color: 'inherit',
            }}
          />
        ))}
      </Stack>

      {project.project_url && (
        <Button
          href={project.project_url}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          endIcon={<OpenInNewIcon />}
          sx={{ alignSelf: 'flex-start', color: 'inherit', opacity: 0.8 }}
        >
          View Project
        </Button>
      )}
    </Box>
  </Paper>
);
