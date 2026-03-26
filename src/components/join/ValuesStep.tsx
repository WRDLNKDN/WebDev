import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

/** Visible required marker for non-TextField groups (matches MUI required * color). */
const RequiredFieldMark = () => (
  <Box
    component="span"
    sx={{ color: 'error.main', fontWeight: 700 }}
    aria-hidden
  >
    {' *'}
  </Box>
);
import { useState } from 'react';
import { useJoin } from '../../context/useJoin';
import type { ValuesData } from '../../types/join';
import { JOIN_REASONS, PARTICIPATION_STYLES } from '../../types/join';
import { BRAND_COLORS } from '../../theme/themeConstants';
import {
  joinFlowPrimaryButtonSx,
  joinFlowSecondaryButtonSx,
  signupPaper,
  valuesStepButtonRow,
  valuesStepSectionSubtext,
  valuesStepSectionTitle,
} from '../../theme/joinStyles';

const joinValuesCheckboxSx = {
  color: 'rgba(255,255,255,0.5)',
  '&.Mui-checked': { color: BRAND_COLORS.purple },
} as const;

const toggleSet = (arr: string[], item: string): string[] =>
  arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

export const ValuesStep = () => {
  const { state, setValues, goToStep } = useJoin();

  const [joinReason, setJoinReason] = useState<string[]>(
    state.values?.joinReason ?? [],
  );
  const [participationStyle, setParticipationStyle] = useState<string[]>(
    state.values?.participationStyle ?? [],
  );
  const [additionalContext, setAdditionalContext] = useState(
    state.values?.additionalContext ?? '',
  );

  const canContinue = joinReason.length > 0 && participationStyle.length > 0;

  const handleContinue = () => {
    const values: ValuesData = {
      joinReason,
      participationStyle,
      additionalContext: additionalContext.trim() || undefined,
    };
    setValues(values);
    goToStep('profile');
  };

  const handleBack = () => {
    goToStep('identity'); // Step 3 → Step 2 (Sign in)
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0, overflow: 'visible' }}>
      <Paper
        elevation={0}
        sx={{
          ...signupPaper,
          maxWidth: 520,
          mx: 'auto',
        }}
      >
        <Stack spacing={{ xs: 1, sm: 2 }}>
          <Typography variant="h5" sx={valuesStepSectionTitle}>
            Your intent
          </Typography>
          <Typography variant="body2" sx={valuesStepSectionSubtext}>
            How do you want to show up? Select at least one for each.
          </Typography>

          <Typography variant="subtitle2" sx={valuesStepSectionTitle}>
            Why are you joining?
            <RequiredFieldMark />
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: 1,
              rowGap: 0.25,
              alignItems: 'center',
            }}
          >
            {JOIN_REASONS.map((reason) => (
              <FormControlLabel
                key={reason}
                control={
                  <Checkbox
                    size="small"
                    checked={joinReason.includes(reason)}
                    onChange={() =>
                      setJoinReason((prev) => toggleSet(prev, reason))
                    }
                    sx={joinValuesCheckboxSx}
                  />
                }
                label={reason}
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  m: 0,
                  '& .MuiTypography-root': { fontSize: '0.875rem' },
                }}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" sx={valuesStepSectionTitle}>
            How do you like to participate?
            <RequiredFieldMark />
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: 1,
              rowGap: 0.25,
              alignItems: 'center',
            }}
          >
            {PARTICIPATION_STYLES.map((style) => (
              <FormControlLabel
                key={style}
                control={
                  <Checkbox
                    size="small"
                    checked={participationStyle.includes(style)}
                    onChange={() =>
                      setParticipationStyle((prev) => toggleSet(prev, style))
                    }
                    sx={joinValuesCheckboxSx}
                  />
                }
                label={style}
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  m: 0,
                  '& .MuiTypography-root': { fontSize: '0.875rem' },
                }}
              />
            ))}
          </Box>

          <TextField
            label="Anything else? (optional)"
            placeholder="Context, goals, or what you're looking for…"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(56,132,210,0.10)',
                color: '#FFFFFF',
                '& fieldset': { borderColor: 'rgba(141,188,229,0.38)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.6)',
                '&.Mui-focused': { color: BRAND_COLORS.purple },
              },
            }}
          />

          <Stack direction="row" sx={{ ...valuesStepButtonRow, width: '100%' }}>
            <Button
              type="button"
              variant="contained"
              size="medium"
              disableElevation
              onClick={() => handleBack()}
              sx={joinFlowSecondaryButtonSx}
            >
              ← Back
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              disableElevation
              onClick={handleContinue}
              disabled={!canContinue}
              sx={{ ...joinFlowPrimaryButtonSx, flex: '0 1 auto' }}
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
