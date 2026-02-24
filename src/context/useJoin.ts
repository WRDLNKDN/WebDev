import { useContext } from 'react';
import { JoinContext, type JoinContextValue } from './JoinContext';

export const useJoin = (): JoinContextValue => {
  const ctx = useContext(JoinContext);
  if (!ctx) throw new Error('useJoin must be used within JoinProvider');
  return ctx;
};

// Backward-compatible alias during Join naming migration.
export const useSignup = useJoin;
