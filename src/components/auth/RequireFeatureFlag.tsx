import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';

/**
 * Route guard: only render children when the feature flag is enabled.
 * Otherwise redirect to /feed.
 */
export const RequireFeatureFlag = ({
  flagKey,
  children,
}: {
  flagKey: string;
  children: React.ReactNode;
}) => {
  const enabled = useFeatureFlag(flagKey);
  if (!enabled) return <Navigate to="/feed" replace />;
  return <>{children}</>;
};
