import { useContext } from 'react';
import { SignupContext, type SignupContextValue } from './SignupContext';

export const useSignup = (): SignupContextValue => {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error('useSignup must be used within SignupProvider');
  return ctx;
};
