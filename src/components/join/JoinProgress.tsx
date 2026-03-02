import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { JoinStep } from '../../types/join';

interface JoinProgressProps {
  currentStep: JoinStep;
  completedSteps: JoinStep[];
}

const STEP_ORDER: JoinStep[] = ['welcome', 'identity', 'values', 'profile'];

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
  const activeIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: 560,
        }}
      >
        {STEP_ORDER.map((step, i) => {
          const isCompleted = completedSteps.includes(step);
          const isActive = step === currentStep;

          return (
            <Box
              key={step}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: i < STEP_ORDER.length - 1 ? 1 : 0,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {isCompleted ? (
                  <CheckCircleIcon sx={{ fontSize: 28, color: '#4ade80' }} />
                ) : (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: isActive
                        ? '2.5px solid #3b82f6'
                        : '2px solid rgba(255,255,255,0.22)',
                      bgcolor: isActive
                        ? 'rgba(59,130,246,0.15)'
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isActive && (
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: '#3b82f6',
                        }}
                      />
                    )}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    color: isCompleted
                      ? '#4ade80'
                      : isActive
                        ? '#fff'
                        : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {STEP_LABELS[step]}
                </Typography>
              </Box>

              {i < STEP_ORDER.length - 1 && (
                <Box
                  sx={{
                    flex: 1,
                    height: '1.5px',
                    mx: 0.75,
                    mt: '13px',
                    bgcolor: completedSteps.includes(step)
                      ? 'rgba(74,222,128,0.45)'
                      : 'rgba(255,255,255,0.1)',
                    alignSelf: 'flex-start',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}
      >
        Step {activeIndex + 1} of {STEP_ORDER.length}
      </Typography>
    </Box>
  );
};

export const SignupProgress = JoinProgress;
