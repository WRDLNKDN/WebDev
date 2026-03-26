import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { WeirdlingPreview } from '../../types/weirdling';
import { WEIRDLING_ASSET_COUNT } from '../../types/weirdling';

export const WeirdlingLoading = ({ isDialog }: { isDialog: boolean }) => {
  if (isDialog) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={40} aria-label="Loading" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={48} aria-label="Loading" />
    </Box>
  );
};

const WeirdlingThumbnailGrid = ({
  value,
  onChange,
  size = 56,
  columns = 6,
}: {
  value: number;
  onChange: (index: number) => void;
  size?: number;
  columns?: number;
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, ${size}px)`,
      gap: 1,
      justifyContent: 'start',
    }}
  >
    {Array.from({ length: WEIRDLING_ASSET_COUNT }, (_, index) => index + 1).map(
      (n) => (
        <Box
          key={n}
          component="button"
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Select Weirdling ${n}`}
          sx={{
            padding: 0,
            border: 2,
            borderColor: value === n ? 'primary.main' : 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            cursor: 'pointer',
            bgcolor: 'transparent',
            '&:hover': { borderColor: 'primary.light' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
            },
          }}
        >
          <Box
            component="img"
            src={`/assets/og_weirdlings/weirdling_${n}.png`}
            alt={`Weirdling ${n}`}
            sx={{
              width: size,
              height: size,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </Box>
      ),
    )}
  </Box>
);

const ErrorBlock = ({ error }: { error: string | null }) =>
  error ? (
    <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>
  ) : null;

type PreviewProps = {
  preview: WeirdlingPreview;
  imageSrc: string;
  error: string | null;
  loading: boolean;
  isDialog: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export const WeirdlingPreviewScreen = ({
  preview,
  imageSrc,
  error,
  loading,
  isDialog,
  onSave,
  onCancel,
}: PreviewProps) => (
  <Container maxWidth="sm" sx={{ py: isDialog ? 2 : 4 }}>
    <Typography variant="h5" component="h1" gutterBottom>
      Your Weirdling preview
    </Typography>
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 2,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-start"
        flexWrap="wrap"
      >
        <Box sx={{ flex: '0 0 auto' }}>
          <Box
            component="img"
            src={imageSrc}
            alt={`${preview.displayName} Weirdling`}
            sx={{
              width: '100%',
              maxWidth: 160,
              height: 'auto',
              borderRadius: 2,
              display: 'block',
            }}
          />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <Typography variant="h6">{preview.displayName}</Typography>
          <Typography variant="body2" color="text.secondary">
            @{preview.handle} · {preview.roleVibe}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {preview.tagline}
          </Typography>
          {preview.bio ? (
            <Typography sx={{ mt: 1 }}>{preview.bio}</Typography>
          ) : null}
          {preview.industryTags.length > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {preview.industryTags.join(', ')}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Box>
    <ErrorBlock error={error} />
    <Stack
      direction="row"
      spacing={2}
      justifyContent="space-between"
      flexWrap="wrap"
    >
      <Button variant="contained" onClick={onSave} disabled={loading}>
        {loading ? 'Saving…' : 'Save'}
      </Button>
      <Button
        variant="outlined"
        {...(!isDialog && { component: RouterLink, to: '/dashboard' })}
        onClick={onCancel}
        disabled={loading}
      >
        Cancel
      </Button>
    </Stack>
  </Container>
);

type ChoiceProps = {
  error: string | null;
  isDialog: boolean;
  onPick: () => void;
  onGenerate: () => void;
};

export const WeirdlingChoiceScreen = ({
  error,
  isDialog,
  onPick,
  onGenerate,
}: ChoiceProps) => (
  <Container maxWidth="sm" sx={{ py: isDialog ? 2 : 4 }}>
    {!isDialog ? (
      <Typography variant="h5" component="h1" gutterBottom>
        Add my Weirdling
      </Typography>
    ) : null}
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Pick one from the set or create your own.
    </Typography>
    <ErrorBlock error={error} />
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Button
        variant="contained"
        size="large"
        onClick={onPick}
        sx={{ minWidth: 180, textTransform: 'none' }}
      >
        Pick a Weirdling
      </Button>
      <Button
        variant="outlined"
        size="large"
        onClick={onGenerate}
        sx={{ minWidth: 180, textTransform: 'none' }}
      >
        Generate one
      </Button>
    </Stack>
  </Container>
);

type PickProps = {
  error: string | null;
  isDialog: boolean;
  displayName: string;
  selectedImageIndex: number;
  loading: boolean;
  onDisplayNameChange: (value: string) => void;
  onSelectImage: (index: number) => void;
  onBack: () => void;
  onSave: () => void;
};

export const WeirdlingPickScreen = ({
  error,
  isDialog,
  displayName,
  selectedImageIndex,
  loading,
  onDisplayNameChange,
  onSelectImage,
  onBack,
  onSave,
}: PickProps) => (
  <Container maxWidth="sm" sx={{ py: isDialog ? 2 : 4 }}>
    {!isDialog ? (
      <Typography variant="h5" component="h1" gutterBottom>
        Add my Weirdling
      </Typography>
    ) : null}
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Pick a Weirdling
    </Typography>
    <ErrorBlock error={error} />
    <Stack spacing={2} sx={{ mb: 2 }}>
      <TextField
        label="Display name (optional)"
        value={displayName}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        fullWidth
        placeholder="e.g. My Weirdling"
      />
      <WeirdlingThumbnailGrid
        value={selectedImageIndex}
        onChange={onSelectImage}
        size={64}
        columns={6}
      />
    </Stack>
    <Stack direction="row" spacing={2} justifyContent="space-between">
      <Button
        variant="outlined"
        onClick={onBack}
        sx={{ textTransform: 'none' }}
      >
        Back
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={loading}
        sx={{ textTransform: 'none' }}
      >
        {loading ? 'Adding…' : 'Add my Weirdling'}
      </Button>
    </Stack>
  </Container>
);
