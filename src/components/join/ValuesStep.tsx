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
import { useState } from 'react';
import { useJoin } from '../../context/useJoin';
import type { ValuesData } from '../../types/join';
import { JOIN_REASONS, PARTICIPATION_STYLES } from '../../types/join';
import {
  signupPaper,
  valuesStepButtonRow,
  valuesStepContinueButton,
  valuesStepSectionSubtext,
  valuesStepSectionTitle,
} from '../../theme/joinStyles';

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
        <Stack spacing={2}>
          <Typography variant="h5" sx={valuesStepSectionTitle}>
            Your intent
          </Typography>
          <Typography variant="body2" sx={valuesStepSectionSubtext}>
            How do you want to show up? Select at least one for each.
          </Typography>

          <Typography variant="subtitle2" sx={valuesStepSectionTitle}>
            Why are you joining?
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
                    sx={{ color: 'rgba(255,255,255,0.5)' }}
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
                    sx={{ color: 'rgba(255,255,255,0.5)' }}
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
                '& .MuiFormLabel-asterisk': { color: '#f44336' },
              },
            }}
          />

          <Stack direction="row" sx={{ ...valuesStepButtonRow, width: '100%' }}>
            <Button
              type="button"
              variant="outlined"
              size="medium"
              onClick={() => handleBack()}
              sx={{
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.6)',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.85)',
                  bgcolor: 'rgba(156,187,217,0.18)',
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: 'rgba(255,255,255,0.6)',
                },
              }}
            >
              ← Back
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={!canContinue}
              sx={valuesStepContinueButton}
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
