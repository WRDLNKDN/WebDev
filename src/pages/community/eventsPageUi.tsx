import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  location_type: string | null;
  host_handle?: string | null;
  host_display_name?: string | null;
  host_avatar?: string | null;
  yes_count?: number;
};

export type CreateEventState = {
  createTitle: string;
  createDescription: string;
  createStartAt: string;
  createEndAt: string;
  createLocation: string;
  createLocationType: 'virtual' | 'physical' | '';
  createLinkUrl: string;
};

type CreateEventDialogProps = {
  open: boolean;
  onClose: () => void;
  state: CreateEventState;
  setState: (next: Partial<CreateEventState>) => void;
  error: string | null;
  submitting: boolean;
  onCreate: () => void;
};

export const CreateEventDialog = ({
  open,
  onClose,
  state,
  setState,
  error,
  submitting,
  onCreate,
}: CreateEventDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    PaperProps={{ sx: { borderRadius: 2 } }}
  >
    <DialogTitle>Create Event</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          label="Title"
          required
          fullWidth
          value={state.createTitle}
          onChange={(e) => setState({ createTitle: e.target.value })}
          placeholder="e.g. AMA with the team"
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={3}
          value={state.createDescription}
          onChange={(e) => setState({ createDescription: e.target.value })}
        />
        <TextField
          label="Start"
          type="datetime-local"
          required
          fullWidth
          value={state.createStartAt}
          onChange={(e) => setState({ createStartAt: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End"
          type="datetime-local"
          fullWidth
          value={state.createEndAt}
          onChange={(e) => setState({ createEndAt: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Location"
          fullWidth
          value={state.createLocation}
          onChange={(e) => setState({ createLocation: e.target.value })}
          placeholder="Virtual or physical address"
        />
        <TextField
          label="Location type"
          select
          fullWidth
          value={state.createLocationType}
          onChange={(e) =>
            setState({
              createLocationType: e.target.value as 'virtual' | 'physical' | '',
            })
          }
          SelectProps={{ native: true }}
        >
          <option value="">—</option>
          <option value="virtual">Virtual</option>
          <option value="physical">Physical</option>
        </TextField>
        <TextField
          label="Link URL"
          fullWidth
          value={state.createLinkUrl}
          onChange={(e) => setState({ createLinkUrl: e.target.value })}
          placeholder="https://..."
        />
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} sx={{ textTransform: 'none' }}>
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onCreate}
        disabled={
          submitting || !state.createTitle.trim() || !state.createStartAt
        }
        sx={{ textTransform: 'none' }}
      >
        {submitting ? 'Creating…' : 'Create'}
      </Button>
    </DialogActions>
  </Dialog>
);

const EventCardList = ({
  items,
  formatDate,
  past = false,
}: {
  items: EventRow[];
  formatDate: (iso: string) => string;
  past?: boolean;
}) => (
  <Stack spacing={2}>
    {items.map((ev) => (
      <Card
        key={ev.id}
        variant="outlined"
        component={RouterLink}
        to={`/events/${ev.id}`}
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          opacity: past ? 0.85 : 1,
          borderRadius: 2,
          transition: past
            ? undefined
            : 'border-color 0.2s, background-color 0.2s',
          '&:hover': past
            ? { opacity: 1, borderColor: 'divider' }
            : { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {ev.title}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mt: 1 }}
            flexWrap="wrap"
          >
            {!past && <PersonIcon fontSize="small" color="action" />}
            <Typography variant="body2" color="text.secondary">
              {ev.host_display_name || ev.host_handle || 'Host'}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              •
            </Typography>
            {!past && <EventIcon fontSize="small" color="action" />}
            <Typography variant="body2" color="text.secondary">
              {formatDate(ev.start_at)}
            </Typography>
            {!past && ev.location && (
              <>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                >
                  •
                </Typography>
                <LocationOnIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {ev.location}
                </Typography>
              </>
            )}
          </Stack>
          {!past && ev.yes_count !== undefined && ev.yes_count > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1 }}
            >
              {ev.yes_count} attending
            </Typography>
          )}
        </CardContent>
      </Card>
    ))}
  </Stack>
);

type EventsContentProps = {
  loading: boolean;
  upcoming: EventRow[];
  past: EventRow[];
  sessionPresent: boolean;
  onOpenCreate: () => void;
  formatDate: (iso: string) => string;
};

export const EventsContent = ({
  loading,
  upcoming,
  past,
  sessionPresent,
  onOpenCreate,
  formatDate,
}: EventsContentProps) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="Loading events" size={48} />
      </Box>
    );
  }

  return (
    <>
      {upcoming.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 2,
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            Upcoming
          </Typography>
          <EventCardList items={upcoming} formatDate={formatDate} />
        </Box>
      )}

      {past.length > 0 && (
        <Box>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              mb: 2,
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            Past Events
          </Typography>
          <EventCardList items={past} formatDate={formatDate} past />
        </Box>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 4,
            bgcolor: 'rgba(18, 18, 18, 0.8)',
            border: '2px dashed rgba(255,255,255,0.1)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            No events yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Create an event to bring the community together.
          </Typography>
          {sessionPresent && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onOpenCreate}
              sx={{ mt: 2, textTransform: 'none' }}
            >
              Create Event
            </Button>
          )}
        </Paper>
      )}
    </>
  );
};
