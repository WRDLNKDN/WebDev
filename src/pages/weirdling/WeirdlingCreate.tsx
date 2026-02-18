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
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import {
  generateWeirdling,
  saveWeirdlingByJobId,
  saveWeirdlingPreview,
} from '../../lib/api/weirdlingApi';
import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';
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

/** Path A: pick from preset. Path B: create your own (generate). */
type WeirdlingPath = 'choice' | 'pick' | 'generate';

const STEPS = [
  'Name & handle',
  'Role & interests',
  'Tone & boundaries',
  'Generate',
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
};

export interface WeirdlingCreateProps {
  /** When provided, wizard runs in dialog mode: call these instead of navigating. */
  onClose?: () => void;
  onSuccess?: () => void;
}

export const WeirdlingCreate = ({
  onClose,
  onSuccess,
}: WeirdlingCreateProps = {}) => {
  const navigate = useNavigate();
  const isDialog = onClose != null || onSuccess != null;
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [path, setPath] = useState<WeirdlingPath>('choice');
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<WeirdlingWizardInputs>({
    displayNameOrHandle: '',
    roleVibe: '',
    industryOrInterests: [],
    tone: 0.5,
    boundaries: '',
    bioSeed: '',
    includeImage: true,
    imageSource: 'preset',
    selectedImageIndex: 1,
  });
  const [industryText, setIndustryText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(1);
  const [preview, setPreview] = useState<WeirdlingPreview | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!session) {
      if (onClose) onClose();
      else navigate('/', { replace: true });
    }
  }, [sessionChecked, session, navigate, onClose]);

  useEffect(() => {
    if (step === 1) {
      setIndustryText(inputs.industryOrInterests.join(', '));
    }
  }, [step, inputs.industryOrInterests]);

  const handleInput = (key: keyof WeirdlingWizardInputs, value: unknown) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateWeirdling(inputs, jobId ?? undefined);
      const usePresetImage =
        inputs.includeImage &&
        inputs.imageSource === 'preset' &&
        inputs.selectedImageIndex != null;
      let previewWithImage = usePresetImage
        ? {
            ...result.preview,
            avatarUrl: `/assets/og_weirdlings/weirdling_${inputs.selectedImageIndex}.png`,
          }
        : result.preview;
      // Generate avatar image with DiceBear when user chose "Create one"
      if (
        inputs.includeImage &&
        inputs.imageSource === 'generate' &&
        result.preview.handle
      ) {
        const seed = `${result.preview.handle}|${result.preview.roleVibe}`;
        const dataUri = createAvatar(bottts, { seed }).toDataUri();
        previewWithImage = { ...previewWithImage, avatarUrl: dataUri };
      }
      setPreview(previewWithImage);
      setJobId(result.jobId);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreview = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      // When avatar is generated (data URI), save full preview so image is persisted
      const hasGeneratedImage = preview.avatarUrl?.startsWith('data:');
      if (hasGeneratedImage || !jobId) {
        await saveWeirdlingPreview(preview);
      } else {
        await saveWeirdlingByJobId(jobId);
      }
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePick = async () => {
    const name = displayName.trim() || 'My Weirdling';
    const handle =
      name.toLowerCase().replace(/\W+/g, '_').slice(0, 32) || 'weirdling';
    const idx = selectedImageIndex ?? 1;
    const previewPayload: WeirdlingPreview = {
      displayName: name,
      handle,
      roleVibe: 'Builder',
      industryTags: [],
      tone: 0.5,
      tagline: 'Picked from the set',
      boundaries: '',
      avatarUrl: `/assets/og_weirdlings/weirdling_${idx}.png`,
      promptVersion: 'pick',
      modelVersion: 'preset',
    };
    setLoading(true);
    setError(null);
    try {
      await saveWeirdlingPreview(previewPayload);
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
    else navigate('/dashboard');
  };

  if (!sessionChecked || !session) {
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

  // Step content for generate path
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
        value={industryText}
        onChange={(e) => setIndustryText(e.target.value)}
        onBlur={() => {
          const parsed = industryText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          setInputs((prev) => ({ ...prev, industryOrInterests: parsed }));
        }}
        fullWidth
        placeholder="e.g. infra, frontend, design"
      />
    </Stack>
  );

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

  const step3Generate = (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary">
        We&apos;ll create your Weirdling from your name, role, and tone. Click
        Generate to create it.
      </Typography>
    </Stack>
  );

  const stepsContent = [step0, step1, step2, step3Generate];

  // Preview screen (after generate)
  if (preview) {
    const previewImageSrc =
      preview.avatarUrl ??
      `/assets/og_weirdlings/weirdling_${inputs.selectedImageIndex ?? 1}.png`;

    return (
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
                src={previewImageSrc}
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
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Button
            variant="contained"
            onClick={handleSavePreview}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            {...(!isDialog && {
              component: RouterLink,
              to: '/dashboard',
            })}
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Stack>
      </Container>
    );
  }

  // Choice screen: Pick a Weirdling vs Create one
  if (path === 'choice') {
    return (
      <Container maxWidth="sm" sx={{ py: isDialog ? 2 : 4 }}>
        {!isDialog && (
          <Typography variant="h5" component="h1" gutterBottom>
            Add my Weirdling
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick one from the set or create your own.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            onClick={() => setPath('pick')}
            sx={{ minWidth: 180, textTransform: 'none' }}
          >
            Pick a Weirdling
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              setPath('generate');
              setInputs((prev) => ({
                ...prev,
                imageSource: 'generate',
                includeImage: true,
              }));
            }}
            sx={{ minWidth: 180, textTransform: 'none' }}
          >
            Generate one
          </Button>
        </Stack>
      </Container>
    );
  }

  // Pick path: canned grid + optional name
  if (path === 'pick') {
    return (
      <Container maxWidth="sm" sx={{ py: isDialog ? 2 : 4 }}>
        {!isDialog && (
          <Typography variant="h5" component="h1" gutterBottom>
            Add my Weirdling
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a Weirdling
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            placeholder="e.g. My Weirdling"
          />
          <WeirdlingThumbnailGrid
            value={selectedImageIndex}
            onChange={setSelectedImageIndex}
            size={64}
            columns={6}
          />
        </Stack>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button
            variant="outlined"
            onClick={() => setPath('choice')}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePick}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            {loading ? 'Adding…' : 'Add my Weirdling'}
          </Button>
        </Stack>
      </Container>
    );
  }

  // Generate path: 4-step wizard
  return (
    <Container maxWidth="sm" sx={{ py: isDialog ? 2 : 4 }}>
      {!isDialog && (
        <Typography variant="h5" component="h1" gutterBottom>
          Add my Weirdling
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}${
          STEPS[step] === 'Generate' ? '' : ' — Generate'
        }`}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>{stepsContent[step]}</Box>
      <Stack direction="row" spacing={2} justifyContent="space-between">
        {step > 0 ? (
          <Button
            variant="outlined"
            onClick={() => setStep((s) => s - 1)}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => setPath('choice')}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => {
              if (step === 1) {
                const parsed = industryText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                setInputs((prev) => ({ ...prev, industryOrInterests: parsed }));
              }
              setStep((s) => s + 1);
            }}
            disabled={
              (step === 0 && !inputs.displayNameOrHandle.trim()) ||
              (step === 1 && !inputs.roleVibe)
            }
            sx={{ textTransform: 'none' }}
          >
            {step === STEPS.length - 2 ? 'Next: Generate' : 'Next'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => void handleGenerate()}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        )}
      </Stack>
    </Container>
  );
};

export default WeirdlingCreate;
