import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase'; // The newly generated types
// The newly generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// We pass the <Database> type here to establish 100% Logic Purity
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
