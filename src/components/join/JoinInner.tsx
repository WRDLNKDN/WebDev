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

  useEffect(() => {
    const checkExistingProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          resetSignup();
          navigate('/feed', { replace: true });
          return;
        }

        if (
          error &&
          (error.code === '42501' ||
            error.code === 'PGRST116' ||
            /permission denied/i.test(error.message ?? ''))
        ) {
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
  // ProfileStep gets a wider layout since it's a full-page hero design
  const isProfileStep = state.currentStep === 'profile';

  return (
    <Box
      component="main"
      sx={{
        ...signupMain,
        // Give profile step room to breathe with a wider max constraint on the progress bar
      }}
    >
      {showProgress && (
        <Box
          sx={{
            ...signupProgressWrapper,
            maxWidth: isProfileStep ? 560 : 640,
          }}
        >
          <JoinProgress
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
          />
        </Box>
      )}

      <Box sx={{ width: '100%', maxWidth: isProfileStep ? 560 : 640 }}>
        {renderStep()}
      </Box>
    </Box>
  );
};

export const SignupInner = JoinInner;
export default JoinInner;
