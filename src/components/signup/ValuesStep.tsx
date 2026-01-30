import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { useSignup } from '../../context/useSignup';
import {
  JOIN_REASONS,
  PARTICIPATION_STYLES,
  type ValuesData,
} from '../../types/signup';

export const ValuesStep = () => {
  const { state, setValues, goToStep, completeStep } = useSignup();

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

  const handleBack = () => {
    const valuesData: ValuesData = {
      joinReason: joinReasons,
      participationStyle: participationStyles,
      additionalContext: additionalContext.trim() || undefined,
    };

    setValues(valuesData);
    goToStep('identity');
  };

  return (
    <Container maxWidth="md">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Values & Intent
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Help us keep the community aligned.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Why are you joining?
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
              Select all that apply
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
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              How do you plan to participate?
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
              Select all that apply
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
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Anything else we should know? (Optional)
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Tell us more about your interests, what you're working on, or what you hope to get from the community..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${additionalContext.length}/500`}
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
            <Button variant="text" onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={!canContinue}
              sx={{ flex: 1 }}
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};
