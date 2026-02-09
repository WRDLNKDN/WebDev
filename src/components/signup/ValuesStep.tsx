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
import { useState } from 'react';

import { useSignup } from '../../context/useSignup';
import {
  JOIN_REASONS,
  PARTICIPATION_STYLES,
  type ValuesData,
} from '../../types/signup';
import './signup.css';
import './ValuesStep.css';

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
      <Paper elevation={0} className="signupPaper valuesStep">
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" className="signupStepLabel">
              Values & Intent
            </Typography>
            <Typography variant="body2" className="signupStepSubtext">
              Help us keep the community aligned.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" className="valuesStepSectionTitle">
              Why are you joining?
            </Typography>
            <Typography variant="body2" className="valuesStepSectionSubtext">
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
            <Typography variant="h6" className="valuesStepSectionTitle">
              How do you plan to participate?
            </Typography>
            <Typography variant="body2" className="valuesStepSectionSubtext">
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
            <Typography variant="h6" className="valuesStepSectionTitle">
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

          <Stack direction="row" spacing={2} className="valuesStepButtonRow">
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'rgba(255,255,255,0.9)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.7)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={!canContinue}
              className="valuesStepContinueButton"
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};
