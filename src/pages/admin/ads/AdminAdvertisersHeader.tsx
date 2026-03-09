import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { MetricsWindowDays } from './adminAdvertisersTypes';

type Props = {
  metricsWindowDays: MetricsWindowDays;
  onMetricsChange: (value: MetricsWindowDays) => void;
  onAdd: () => void;
};

export const AdminAdvertisersHeader = ({
  metricsWindowDays,
  onMetricsChange,
  onAdd,
}: Props) => (
  <>
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Feed Advertisers
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Manage ads shown every 6th post in the Feed. Add, edit, or deactivate
        advertisers.
      </Typography>
      <Typography
        variant="caption"
        sx={{ opacity: 0.7, display: 'block', mt: 0.75 }}
      >
        Metrics below show tracked impressions/clicks for the selected window.
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Window:
        </Typography>
        <ToggleButtonGroup
          size="small"
          color="primary"
          exclusive
          value={metricsWindowDays}
          onChange={(_, next: MetricsWindowDays | null) => {
            if (next) onMetricsChange(next);
          }}
          aria-label="Ad metrics window"
        >
          <ToggleButton value={7}>7d</ToggleButton>
          <ToggleButton value={30}>30d</ToggleButton>
          <ToggleButton value={90}>90d</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Box>

    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onAdd}
      sx={{ mb: 2 }}
    >
      Add Advertiser
    </Button>
  </>
);
