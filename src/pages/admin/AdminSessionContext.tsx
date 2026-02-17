import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

const AdminSessionContext = createContext<Session | null>(null);

export const AdminSessionProvider = AdminSessionContext.Provider;

export function useAdminSession(): Session | null {
  return useContext(AdminSessionContext);
}
