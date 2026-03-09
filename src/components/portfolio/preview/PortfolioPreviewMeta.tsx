import { Box, Chip, Typography } from '@mui/material';
import type { PortfolioItem } from '../../../types/portfolio';

type PortfolioPreviewMetaProps = {
  project: PortfolioItem | null;
};

export const PortfolioPreviewMeta = ({
  project,
}: PortfolioPreviewMetaProps) => {
  return (
    <>
      {project?.description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 1,
            px: 1.25,
            py: 1,
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          {project.description}
        </Typography>
      )}
      {Array.isArray(project?.tech_stack) && project.tech_stack.length > 0 && (
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
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'text.secondary',
                  border: '1px solid rgba(255,255,255,0.16)',
                }}
              />
            ))}
        </Box>
      )}
    </>
  );
};
