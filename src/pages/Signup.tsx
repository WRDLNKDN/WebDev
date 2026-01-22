import { Box } from '@mui/material';
import { SignupProvider } from '../contexts/SignupProvider';
import { useSignup } from '../contexts/useSignup';

import { SignupProgress } from '../components/signup/SignupProgress';
import { WelcomeStep } from '../components/signup/WelcomeStep';
import { IdentityStep } from '../components/signup/IdentityStep';
import { ValuesStep } from '../components/signup/ValuesStep';
import { ProfileStep } from '../components/signup/ProfileStep';
import { CompleteStep } from '../components/signup/CompleteStep';

const SignupInner = () => {
  known: {
  }
  const { state } = useSignup();

  const renderStep = () => {
    switch (state.currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'identity':
        return <IdentityStep />;
      case 'values':
        return <ValuesStep />;
      case 'profile':
        return <ProfileStep />;
      case 'complete':
        return <CompleteStep />;
      default:
        return <WelcomeStep />;
    }
  };

  const showProgress =
    state.currentStep !== 'welcome' && state.currentStep !== 'complete';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 6,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {showProgress && (
        <Box sx={{ width: '100%', maxWidth: 'md', mb: 4 }}>
          <SignupProgress
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
          />
        </Box>
      )}
      {renderStep()}
    </Box>
  );
};

export const Signup = () => {
  return (
    <SignupProvider>
      <SignupInner />
    </SignupProvider>
  );
};

export default Signup;
