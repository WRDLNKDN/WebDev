import {
    Box,
    Step,
    StepLabel,
    Stepper,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import type { SignupStep } from '../../types/signup';
import './SignupProgress.css';

interface SignupProgressProps {
  currentStep: SignupStep;
  completedSteps: SignupStep[];
}

// Only the steps that actually appear in the progress UI
const STEP_ORDER: SignupStep[] = ['welcome', 'identity', 'values', 'profile'];

// Labels for every possible step in the union (including "complete")
const STEP_LABELS: Record<SignupStep, string> = {
  welcome: 'Welcome',
  identity: 'Identity',
  values: 'Values',
  profile: 'Profile',
  complete: 'Complete',
};

export const SignupProgress = ({
  currentStep,
  completedSteps,
}: SignupProgressProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const activeStepIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <Box className="signupProgress">
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
                  <Box component="span" className="signupProgressStepLabel">
                    (Step {index + 1} of {STEP_ORDER.length})
                  </Box>
                )}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {!isMobile && (
        <Box className="signupProgressFooter">
          <Box component="span">
            Step {activeStepIndex + 1} of {STEP_ORDER.length}
          </Box>
        </Box>
      )}
    </Box>
  );
};
