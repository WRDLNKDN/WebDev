import {
  Box,
  Step,
  StepLabel,
  Stepper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  signupProgress,
  signupProgressFooter,
  signupProgressStepLabel,
} from '../../theme/joinStyles';
import type { JoinStep } from '../../types/join';

interface JoinProgressProps {
  currentStep: JoinStep;
  completedSteps: JoinStep[];
}

// Only the steps that actually appear in the progress UI
const STEP_ORDER: JoinStep[] = ['welcome', 'identity', 'values', 'profile'];

// Labels for every possible step in the union (including "complete")
const STEP_LABELS: Record<JoinStep, string> = {
  welcome: 'Welcome',
  identity: 'Sign in',
  values: 'Your Intent',
  profile: 'Profile',
  complete: 'Complete',
};

export const JoinProgress = ({
  currentStep,
  completedSteps,
}: JoinProgressProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const activeStepIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <Box sx={signupProgress}>
      <Stepper
        activeStep={activeStepIndex}
        alternativeLabel={!isMobile}
        orientation={isMobile ? 'vertical' : 'horizontal'}
      >
        {STEP_ORDER.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isActive = step === currentStep;

          return (
            <Step key={step} completed={isCompleted}>
              <StepLabel>
                {STEP_LABELS[step]}
                {isMobile && isActive && (
                  <Box component="span" sx={signupProgressStepLabel}>
                    (Step {index + 1} of {STEP_ORDER.length})
                  </Box>
                )}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {!isMobile && (
        <Box sx={signupProgressFooter}>
          <Box component="span">
            Step {activeStepIndex + 1} of {STEP_ORDER.length}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Backward-compatible alias during Join naming migration.
export const SignupProgress = JoinProgress;
