import { Box, Chip, Typography } from '@mui/material';
import { getProjectDisplayCategories } from '../../../lib/portfolio/categoryUtils';
import type { PortfolioItem } from '../../../types/portfolio';

type PortfolioPreviewMetaProps = {
  project: PortfolioItem | null;
};

export const PortfolioPreviewMeta = ({
  project,
}: PortfolioPreviewMetaProps) => {
  const categories = getProjectDisplayCategories(project?.tech_stack);

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
            border: '1px solid rgba(156,187,217,0.18)',
            borderRadius: 1,
            px: 1.25,
            py: 1,
            bgcolor: 'rgba(56,132,210,0.06)',
          }}
        >
          {project.description}
        </Typography>
      )}
      {categories.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {categories.map((tag) => (
            <Chip
              key={`preview-tag-${tag}`}
              label={tag}
              size="small"
              sx={{
                borderRadius: 1,
                bgcolor: 'rgba(156,187,217,0.18)',
                color: 'text.secondary',
                border: '1px solid rgba(156,187,217,0.32)',
              }}
            />
          ))}
        </Box>
      )}
    </>
  );
};
