import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use the anonymous key for client-side operations, which is secure.
// Row Level Security (RLS) should be enabled in your Supabase project.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
