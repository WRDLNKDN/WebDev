import { useEffect } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSignup } from '../../context/useSignup';
import { supabase } from '../../lib/supabaseClient';

import { SignupProgress } from './SignupProgress';
import { WelcomeStep } from './WelcomeStep';
import { IdentityStep } from './IdentityStep';
import { ValuesStep } from './ValuesStep';
import { ProfileStep } from './ProfileStep';
import { CompleteStep } from './CompleteStep';

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
    <Box
      component="main"
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

export default SignupInner;
