import {
  Alert,
  Box,
  Button,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { WeirdlingWizardInputs } from '../../types/weirdling';

export const ROLE_VIBES = [
  'Builder',
  'Chaos Coordinator',
  'Wizard',
  'Spreadsheet Necromancer',
  'Debugger',
  'Architect',
];

export const STEPS = [
  'Name & handle',
  'Role & interests',
  'Tone & boundaries',
  'Generate',
];

type GenerateProps = {
  error: string | null;
  isDialog: boolean;
  step: number;
  inputs: WeirdlingWizardInputs;
  industryText: string;
  loading: boolean;
  onFieldChange: (key: keyof WeirdlingWizardInputs, value: unknown) => void;
  onIndustryTextChange: (value: string) => void;
  onIndustryBlur: () => void;
  onBackStep: () => void;
  onBackToChoice: () => void;
  onNextStep: () => void;
  onGenerate: () => void;
};

const ErrorBlock = ({ error }: { error: string | null }) =>
  error ? (
    <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>
  ) : null;

const StepNameAndHandle = ({
  inputs,
  onFieldChange,
}: Pick<GenerateProps, 'inputs' | 'onFieldChange'>) => (
  <Stack spacing={2}>
    <TextField
      label="Display name or handle"
      value={inputs.displayNameOrHandle}
      onChange={(event) =>
        onFieldChange('displayNameOrHandle', event.target.value)
      }
      fullWidth
      required
    />
  </Stack>
);

const StepRoleAndInterests = ({
  inputs,
  industryText,
  onFieldChange,
  onIndustryTextChange,
  onIndustryBlur,
}: Pick<
  GenerateProps,
  | 'inputs'
  | 'industryText'
  | 'onFieldChange'
  | 'onIndustryTextChange'
  | 'onIndustryBlur'
>) => (
  <Stack spacing={2}>
    <Typography variant="subtitle2">Role vibe</Typography>
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {ROLE_VIBES.map((value) => (
        <Button
          key={value}
          variant={inputs.roleVibe === value ? 'contained' : 'outlined'}
          size="small"
          onClick={() => onFieldChange('roleVibe', value)}
        >
          {value}
        </Button>
      ))}
    </Stack>
    <TextField
      label="Industry or interests (comma-separated)"
      value={industryText}
      onChange={(event) => onIndustryTextChange(event.target.value)}
      onBlur={onIndustryBlur}
      fullWidth
      placeholder="e.g. infra, frontend, design"
    />
  </Stack>
);

const StepToneAndBoundaries = ({
  inputs,
  onFieldChange,
}: Pick<GenerateProps, 'inputs' | 'onFieldChange'>) => (
  <Stack spacing={2}>
    <Typography variant="subtitle2">Tone: serious (0) — absurd (1)</Typography>
    <Slider
      value={inputs.tone}
      onChange={(_, value) => onFieldChange('tone', value as number)}
      min={0}
      max={1}
      step={0.1}
      valueLabelDisplay="auto"
    />
    <TextField
      label="Boundaries (things to avoid in generated content)"
      value={inputs.boundaries}
      onChange={(event) => onFieldChange('boundaries', event.target.value)}
      fullWidth
      multiline
      rows={2}
    />
  </Stack>
);

const StepGenerate = () => (
  <Stack spacing={2}>
    <Typography variant="body1" color="text.secondary">
      We&apos;ll create your Weirdling from your name, role, and tone. Click
      Generate to create it.
    </Typography>
  </Stack>
);

const buildStepSubtitle = (step: number) =>
  `Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}${STEPS[step] === 'Generate' ? '' : ' — Generate'}`;

export const WeirdlingGenerateContent = ({
  error,
  step,
  inputs,
  industryText,
  loading,
  onFieldChange,
  onIndustryTextChange,
  onIndustryBlur,
  onBackStep,
  onBackToChoice,
  onNextStep,
  onGenerate,
}: GenerateProps) => {
  const stepsContent = [
    <StepNameAndHandle
      key="name"
      inputs={inputs}
      onFieldChange={onFieldChange}
    />,
    <StepRoleAndInterests
      key="role"
      inputs={inputs}
      industryText={industryText}
      onFieldChange={onFieldChange}
      onIndustryTextChange={onIndustryTextChange}
      onIndustryBlur={onIndustryBlur}
    />,
    <StepToneAndBoundaries
      key="tone"
      inputs={inputs}
      onFieldChange={onFieldChange}
    />,
    <StepGenerate key="generate" />,
  ];

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {buildStepSubtitle(step)}
      </Typography>
      <ErrorBlock error={error} />
      <Box sx={{ mb: 2 }}>{stepsContent[step]}</Box>
      <Stack direction="row" spacing={2} justifyContent="space-between">
        {step > 0 ? (
          <Button
            variant="outlined"
            onClick={onBackStep}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={onBackToChoice}
            sx={{ textTransform: 'none' }}
          >
            Back
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={onNextStep}
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
            onClick={onGenerate}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        )}
      </Stack>
    </>
  );
};

export const WeirdlingGenerateScreen = ({
  isDialog,
  ...props
}: GenerateProps) => (
  <Box
    component="section"
    sx={{ py: isDialog ? 2 : 4, maxWidth: 600, mx: 'auto', px: 3 }}
  >
    {!isDialog ? (
      <Typography variant="h5" component="h1" gutterBottom>
        Add my Weirdling
      </Typography>
    ) : null}
    <WeirdlingGenerateContent {...props} isDialog={isDialog} />
  </Box>
);
