import { Box } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJoin } from '../../context/useJoin';
import { supabase } from '../../lib/auth/supabaseClient';

import { signupMain, signupProgressWrapper } from '../../theme/joinStyles';
import { IdentityStep } from './IdentityStep';
import { ProfileStep } from './ProfileStep';
import { JoinProgress } from './JoinProgress';
import { ValuesStep } from './ValuesStep';
import { WelcomeStep } from './WelcomeStep';

export const JoinInner = () => {
  const navigate = useNavigate();
  const { state, resetSignup } = useJoin();

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
          .maybeSingle();

        if (profile) {
          // User already has profile — go straight to feed, never re-enter wizard
          resetSignup();
          navigate('/feed', { replace: true });
        }
      }
    };

    void checkExistingProfile();
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
          <JoinProgress
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
          />
        </Box>
      )}

      {renderStep()}
    </Box>
  );
};

// Backward-compatible alias during Join naming migration.
export const SignupInner = JoinInner;
export default JoinInner;
