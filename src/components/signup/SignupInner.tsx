import { Box } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';
import { supabase } from '../../lib/supabaseClient';

import { signupMain, signupProgressWrapper } from '../../theme/signupStyles';
import { CompleteStep } from './CompleteStep';
import { IdentityStep } from './IdentityStep';
import { ProfileStep } from './ProfileStep';
import { SignupProgress } from './SignupProgress';
import { ValuesStep } from './ValuesStep';
import { WelcomeStep } from './WelcomeStep';

export const SignupInner = () => {
  const navigate = useNavigate();
  const { state, resetSignup } = useSignup();

  // Check if user already has a profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // User already has profile, redirect home
          resetSignup();
          navigate('/', { replace: true });
        }
      }
    };

    checkExistingProfile();
  }, [navigate, resetSignup]);

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
    <Box component="main" sx={signupMain}>
      {showProgress && (
        <Box sx={signupProgressWrapper}>
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

export default SignupInner;
