import type { JoinStep } from '../../../types/join';

export const shouldAutoAdvanceIdentityStep = (
  completedSteps: JoinStep[],
): boolean => !completedSteps.includes('values');
