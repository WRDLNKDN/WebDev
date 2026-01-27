import React, { useState, useEffect } from 'react';
import { SignupContext } from './SignupContext';
import type { SignupContextValue } from './SignupContext';
import type {
  SignupState,
  SignupStep,
  IdentityData,
  ValuesData,
  ProfileData,
} from '../types/signup';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'wrdlnkdn_signup_state';

const initialState: SignupState = {
  currentStep: 'welcome',
  completedSteps: [],
  identity: null,
  values: null,
  profile: null,
};

export const SignupProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<SignupState>(initialState);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize state on mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Check if user is already authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // Check if user has a profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            // User has profile, clear any signup state
            localStorage.removeItem(STORAGE_KEY);
            setState(initialState);
            setIsLoading(false);
            return;
          }
        }

        // Load saved state from localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedState = JSON.parse(saved);
          setState(parsedState);
        }
      } catch (error) {
        console.error('Error initializing signup state:', error);
        setState(initialState);
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoading]);

  const setIdentity = (data: IdentityData) => {
    setState((prev) => ({ ...prev, identity: data }));
  };

  const setValues = (data: ValuesData) => {
    setState((prev) => ({ ...prev, values: data }));
  };

  const setProfile = (data: ProfileData) => {
    setState((prev) => ({ ...prev, profile: data }));
  };

  const goToStep = (step: SignupStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const completeStep = (step: SignupStep) => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }));
  };

  const resetSignup = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: SignupContextValue = {
    state,
    setIdentity,
    setValues,
    setProfile,
    goToStep,
    completeStep,
    resetSignup,
  };

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <SignupContext.Provider value={value}>{children}</SignupContext.Provider>
  );
};
