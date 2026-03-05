import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '../../context/FeatureFlagsContext';

/**
 * Route guard: only render children when the feature flag is enabled.
 * Otherwise redirect to fallback route (defaults to /feed).
 */
export const RequireFeatureFlag = ({
  flagKey,
  fallbackTo = '/feed',
  children,
}: {
  flagKey: string;
  fallbackTo?: string;
  children: React.ReactNode;
}) => {
  const enabled = useFeatureFlag(flagKey);
  if (!enabled) return <Navigate to={fallbackTo} replace />;
  return <>{children}</>;
};
