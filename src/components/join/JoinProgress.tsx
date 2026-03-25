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
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        mb: { xs: 1, sm: 1.5 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: 560,
          minWidth: 0,
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
                  <CheckCircleIcon
                    sx={{
                      fontSize: { xs: 22, sm: 28 },
                      color: '#4ade80',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: { xs: 22, sm: 28 },
                      height: { xs: 22, sm: 28 },
                      borderRadius: '50%',
                      border: isActive
                        ? '2.5px solid #3884D2'
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
                          bgcolor: '#3884D2',
                        }}
                      />
                    )}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { xs: '0.62rem', sm: '0.72rem' },
                    lineHeight: 1.15,
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    color: isCompleted
                      ? '#4ade80'
                      : isActive
                        ? '#FFFFFF'
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
                    mx: { xs: 0.25, sm: 0.75 },
                    mt: { xs: '11px', sm: '13px' },
                    bgcolor: completedSteps.includes(step)
                      ? 'rgba(74,222,128,0.45)'
                      : 'rgba(156,187,217,0.22)',
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
