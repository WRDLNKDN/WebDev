import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { BRAND_COLORS } from '../../theme/themeConstants';
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

/** Signup stepper: one accent (brand purple) for completed + active ring. */
const STEPPER_PURPLE = BRAND_COLORS.purple;
const STEPPER_PURPLE_LINE = 'rgba(167, 68, 194, 0.5)';
const STEPPER_TRACK_MUTED = 'rgba(156,187,217,0.22)';
const STEPPER_PURPLE_ACTIVE_FILL = 'rgba(167, 68, 194, 0.2)';

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
        mb: { xs: 0.35, sm: 0.5, md: 0.4 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: 500,
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
                      fontSize: { xs: 20, sm: 24 },
                      color: STEPPER_PURPLE,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: { xs: 20, sm: 24 },
                      height: { xs: 20, sm: 24 },
                      borderRadius: '50%',
                      border: isActive
                        ? `2.5px solid ${STEPPER_PURPLE}`
                        : '2px solid rgba(255,255,255,0.22)',
                      bgcolor: isActive
                        ? STEPPER_PURPLE_ACTIVE_FILL
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
                          bgcolor: STEPPER_PURPLE,
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
                      ? STEPPER_PURPLE
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
                    mt: { xs: '10px', sm: '12px' },
                    bgcolor: completedSteps.includes(step)
                      ? STEPPER_PURPLE_LINE
                      : STEPPER_TRACK_MUTED,
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
        sx={{
          color: 'rgba(211, 176, 220, 0.72)',
          fontSize: '0.72rem',
        }}
      >
        Step {activeIndex + 1} of {STEP_ORDER.length}
      </Typography>
    </Box>
  );
};

export const SignupProgress = JoinProgress;
