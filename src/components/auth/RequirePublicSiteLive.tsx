import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePublicComingSoonMode } from '../../context/FeatureFlagsContext';

type RequirePublicSiteLiveProps = {
  children: ReactNode;
};

export const RequirePublicSiteLive = ({
  children,
}: RequirePublicSiteLiveProps) => {
  const comingSoon = usePublicComingSoonMode();

  if (comingSoon) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
