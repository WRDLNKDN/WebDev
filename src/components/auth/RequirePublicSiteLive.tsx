import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProductionComingSoonMode } from '../../context/FeatureFlagsContext';

type RequirePublicSiteLiveProps = {
  children: ReactNode;
};

/** Blocks `/join` only when **production** is in strict coming-soon. UAT stays open for QA. */
export const RequirePublicSiteLive = ({
  children,
}: RequirePublicSiteLiveProps) => {
  const productionComingSoon = useProductionComingSoonMode();

  if (productionComingSoon) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
