import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { supabase } from '../../lib/auth/supabaseClient';
import { useJoin } from '../../context/useJoin';
import {
  signupPaper,
  signupStepLabel,
  signupStepSubtext,
  valuesStepButtonRow,
  valuesStepContinueButton,
  valuesStepSectionSubtext,
  valuesStepSectionTitle,
} from '../../theme/joinStyles';
import {
  JOIN_REASONS,
  PARTICIPATION_STYLES,
  type ValuesData,
} from '../../types/join';

export const ValuesStep = () => {
  const { state, setValues, goToStep, completeStep, resetSignup } = useJoin();

  const [joinReasons, setJoinReasons] = useState<string[]>(
    state.values?.joinReason || [],
  );
  const [participationStyles, setParticipationStyles] = useState<string[]>(
    state.values?.participationStyle || [],
  );
  const [additionalContext, setAdditionalContext] = useState(
    state.values?.additionalContext || '',
  );

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const canContinue = joinReasons.length > 0 && participationStyles.length > 0;

  const handleContinue = () => {
    const valuesData: ValuesData = {
      joinReason: joinReasons,
      participationStyle: participationStyles,
      additionalContext: additionalContext.trim() || undefined,
    };

    setValues(valuesData);
    completeStep('values');
    goToStep('profile');
  };

  const handleStartOver = async () => {
    await supabase.auth.signOut();
    resetSignup();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, 0));
    });
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          ...signupPaper,
          maxWidth: 640,
          mx: 'auto',
          overflow: 'hidden',
          '& .MuiFormControlLabel-root': {
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          },
        }}
      >
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={signupStepLabel}>
              Your Intent
            </Typography>
            <Typography variant="body2" sx={signupStepSubtext}>
              Tell us why you&apos;re here and how you plan to show up.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={valuesStepSectionTitle}>
              What brings you here?{' '}
              <Typography
                component="span"
                sx={{
                  fontWeight: 500,
                  color: 'error.main',
                  fontSize: '0.85em',
                }}
              >
                (Required)
              </Typography>
            </Typography>
            <Typography variant="body2" sx={valuesStepSectionSubtext}>
              Select at least one.
            </Typography>

            <FormGroup>
              {JOIN_REASONS.map((reason) => (
                <FormControlLabel
                  key={reason}
                  control={
                    <Checkbox
                      checked={joinReasons.includes(reason)}
                      onChange={() =>
                        setJoinReasons((prev) => toggle(prev, reason))
                      }
                    />
                  }
                  label={reason}
                />
              ))}
            </FormGroup>
          </Box>

          <Box>
            <Typography variant="h6" sx={valuesStepSectionTitle}>
              How will you participate?{' '}
              <Typography
                component="span"
                sx={{
                  fontWeight: 500,
                  color: 'error.main',
                  fontSize: '0.85em',
                }}
              >
                (Required)
              </Typography>
            </Typography>
            <Typography variant="body2" sx={valuesStepSectionSubtext}>
              Select at least one.
            </Typography>

            <FormGroup>
              {PARTICIPATION_STYLES.map((style) => (
                <FormControlLabel
                  key={style}
                  control={
                    <Checkbox
                      checked={participationStyles.includes(style)}
                      onChange={() =>
                        setParticipationStyles((prev) => toggle(prev, style))
                      }
                    />
                  }
                  label={style}
                />
              ))}
            </FormGroup>
          </Box>

          <Box>
            <Typography variant="h6" sx={valuesStepSectionTitle}>
              Anything else you&apos;d like us to know? (Optional)
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder={
                "Tell us more about your interests, what you're working on, " +
                'or what you hope to get from the community...'
              }
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${additionalContext.length}/500`}
            />
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={valuesStepButtonRow}
          >
            <Button
              variant="outlined"
              onClick={() => void handleStartOver()}
              sx={{
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.6)',
                color: '#fff',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.85)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: 'rgba(255,255,255,0.6)',
                },
              }}
            >
              Start over
            </Button>
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
