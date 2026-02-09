import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Paper, Typography } from '@mui/material';
import { CANDY_HAZARD } from '../../theme/candyStyles';

interface AddProjectCardProps {
  onClick: () => void;
}

export const AddProjectCard = ({ onClick }: AddProjectCardProps) => {
  return (
    <Paper
      onClick={(e) => {
        // Accessibility: Remove focus ring after click to keep it clean
        e.currentTarget.blur();
        onClick();
      }}
      sx={{
        minWidth: 320,
        height: 400,
        borderRadius: 3,
        scrollSnapAlign: 'start',
        ...CANDY_HAZARD,
      }}
    >
      <AddCircleOutlineIcon
        sx={{
          fontSize: 60,
          mb: 2,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
      />
      <Typography variant="h6" fontWeight={800} letterSpacing={1}>
        ADD PROJECT
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.8, mt: 1 }}>
        INITIALIZE
      </Typography>
    </Paper>
  );
};
