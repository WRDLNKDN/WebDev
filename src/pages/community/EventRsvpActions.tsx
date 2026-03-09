import { Button, Paper, Stack, Typography } from '@mui/material';

type EventRsvpActionsProps = {
  viewerRsvp: string | null;
  saving: boolean;
  rsvpCounts: { yes: number; no: number; maybe: number };
  onSetRsvp: (status: 'yes' | 'no' | 'maybe') => void;
};

export const EventRsvpActions = ({
  viewerRsvp,
  saving,
  rsvpCounts,
  onSetRsvp,
}: EventRsvpActionsProps) => (
  <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2 }}>
    <Typography variant="subtitle2" gutterBottom>
      Will you attend?
    </Typography>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      flexWrap="wrap"
      useFlexGap
      sx={{
        '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
      }}
    >
      <Button
        size="small"
        variant={viewerRsvp === 'yes' ? 'contained' : 'outlined'}
        onClick={() => onSetRsvp('yes')}
        disabled={saving}
        sx={{ textTransform: 'none' }}
      >
        Yes {rsvpCounts.yes > 0 && `(${rsvpCounts.yes})`}
      </Button>
      <Button
        size="small"
        variant={viewerRsvp === 'maybe' ? 'contained' : 'outlined'}
        onClick={() => onSetRsvp('maybe')}
        disabled={saving}
        sx={{ textTransform: 'none' }}
      >
        Maybe {rsvpCounts.maybe > 0 && `(${rsvpCounts.maybe})`}
      </Button>
      <Button
        size="small"
        variant={viewerRsvp === 'no' ? 'contained' : 'outlined'}
        onClick={() => onSetRsvp('no')}
        disabled={saving}
        sx={{ textTransform: 'none' }}
      >
        No {rsvpCounts.no > 0 && `(${rsvpCounts.no})`}
      </Button>
    </Stack>
  </Paper>
);
