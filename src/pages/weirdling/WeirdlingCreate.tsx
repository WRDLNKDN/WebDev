import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  generateWeirdling,
  saveWeirdlingByJobId,
  saveWeirdlingPreview,
} from '../../lib/weirdlingApi';
import type {
  WeirdlingPreview,
  WeirdlingWizardInputs,
} from '../../types/weirdling';
import { WEIRDLING_ASSET_COUNT } from '../../types/weirdling';

const ROLE_VIBES = [
  'Builder',
  'Chaos Coordinator',
  'Wizard',
  'Spreadsheet Necromancer',
  'Debugger',
  'Architect',
];

const STEPS = [
  'Name & handle',
  'Role & interests',
  'Tone & boundaries',
  'Optional',
];

/** Thumbnail grid for picking a Weirdling image (1..N). */
const WeirdlingThumbnailGrid = ({
  value,
  onChange,
  size = 56,
  columns = 6,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
  columns?: number;
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, ${size}px)`,
        gap: 1,
        justifyContent: 'start',
      }}
    >
      {Array.from({ length: WEIRDLING_ASSET_COUNT }, (_, i) => i + 1).map(
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
              src={`/assets/weirdling_${n}.png`}
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
};

export const WeirdlingCreate = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session ?? null);
      setSessionChecked(true);
    };
    void init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled) setSession(s ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!session) navigate('/', { replace: true });
  }, [sessionChecked, session, navigate]);

  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<WeirdlingWizardInputs>({
    displayNameOrHandle: '',
    roleVibe: '',
    industryOrInterests: [],
    tone: 0.5,
    boundaries: '',
    bioSeed: '',
    includeImage: true,
    selectedImageIndex: 1,
  });
  const [preview, setPreview] = useState<WeirdlingPreview | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInput = (key: keyof WeirdlingWizardInputs, value: unknown) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateWeirdling(inputs, jobId ?? undefined);
      const previewWithImage =
        inputs.includeImage && inputs.selectedImageIndex != null
          ? {
              ...result.preview,
              avatarUrl: `/assets/weirdling_${inputs.selectedImageIndex}.png`,
            }
          : result.preview;
      setPreview(previewWithImage);
      setJobId(result.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      if (jobId) {
        await saveWeirdlingByJobId(jobId);
      } else {
        await saveWeirdlingPreview(preview);
      }
      navigate('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setPreview(null);
    handleGenerate();
  };

  const handleEdit = () => {
    setPreview(null);
    setStep(0);
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (!sessionChecked || !session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={48} aria-label="Loading" />
      </Box>
    );
  }

  // Step 0: name/handle
  const step0 = (
    <Stack spacing={2}>
      <TextField
        label="Display name or handle"
        value={inputs.displayNameOrHandle}
        onChange={(e) => handleInput('displayNameOrHandle', e.target.value)}
        fullWidth
        required
      />
    </Stack>
  );

  // Step 1: role + interests
  const step1 = (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Role vibe</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {ROLE_VIBES.map((v) => (
          <Button
            key={v}
            variant={inputs.roleVibe === v ? 'contained' : 'outlined'}
            size="small"
            onClick={() => handleInput('roleVibe', v)}
          >
            {v}
          </Button>
        ))}
      </Stack>
      <TextField
        label="Industry or interests (comma-separated)"
        value={inputs.industryOrInterests.join(', ')}
        onChange={(e) =>
          handleInput(
            'industryOrInterests',
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        fullWidth
        placeholder="e.g. infra, frontend, design"
      />
    </Stack>
  );

  // Step 2: tone + boundaries
  const step2 = (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        Tone: serious (0) — absurd (1)
      </Typography>
      <Slider
        value={inputs.tone}
        onChange={(_, v) => handleInput('tone', v as number)}
        min={0}
        max={1}
        step={0.1}
        valueLabelDisplay="auto"
      />
      <TextField
        label="Boundaries (things to avoid in generated content)"
        value={inputs.boundaries}
        onChange={(e) => handleInput('boundaries', e.target.value)}
        fullWidth
        multiline
        rows={2}
      />
    </Stack>
  );

  // Step 3: optional + image choice
  const step3 = (
    <Stack spacing={2}>
      <TextField
        label="Optional: short bio seed"
        value={inputs.bioSeed ?? ''}
        onChange={(e) => handleInput('bioSeed', e.target.value)}
        fullWidth
        multiline
        rows={2}
      />
      <Button
        variant={inputs.includeImage ? 'contained' : 'outlined'}
        onClick={() => handleInput('includeImage', !inputs.includeImage)}
      >
        {inputs.includeImage ? 'Include image' : 'No image'}
      </Button>
      {inputs.includeImage && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Pick your Weirdling</Typography>
          <WeirdlingThumbnailGrid
            value={inputs.selectedImageIndex ?? 1}
            onChange={(n) => handleInput('selectedImageIndex', n)}
            size={52}
            columns={6}
          />
        </Stack>
      )}
    </Stack>
  );

  const stepsContent = [step0, step1, step2, step3];

  if (preview) {
    const previewImageIndex =
      preview.avatarUrl != null
        ? (() => {
            const m = preview.avatarUrl.match(/weirdling_(\d+)\.png$/);
            return m ? Number(m[1]) : (inputs.selectedImageIndex ?? 1);
          })()
        : (inputs.selectedImageIndex ?? 1);

    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
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
                src={
                  preview.avatarUrl ??
                  `/assets/weirdling_${previewImageIndex}.png`
                }
                alt={`${preview.displayName} Weirdling`}
                sx={{
                  width: '100%',
                  maxWidth: 160,
                  height: 'auto',
                  borderRadius: 2,
                  display: 'block',
                }}
              />
              <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.5 }}>
                Choose image
              </Typography>
              <WeirdlingThumbnailGrid
                value={previewImageIndex}
                onChange={(n) => {
                  setPreview((p) =>
                    p ? { ...p, avatarUrl: `/assets/weirdling_${n}.png` } : p,
                  );
                  setInputs((prev) => ({ ...prev, selectedImageIndex: n }));
                }}
                size={48}
                columns={6}
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
              {preview.bio && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {preview.bio}
                </Typography>
              )}
              {preview.industryTags.length > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {preview.industryTags.join(', ')}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleRegenerate}
            disabled={loading}
          >
            Regenerate
          </Button>
          <Button variant="outlined" onClick={handleEdit} disabled={loading}>
            Edit
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/dashboard"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Create your Weirdling
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mb: 3 }}>{stepsContent[step]}</Box>
      <Stack direction="row" spacing={2}>
        {step > 0 && (
          <Button variant="outlined" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && !inputs.displayNameOrHandle.trim()) ||
              (step === 1 && !inputs.roleVibe)
            }
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        )}
      </Stack>
    </Container>
  );
};

export default WeirdlingCreate;
