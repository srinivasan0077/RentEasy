import { createClient } from '@supabase/supabase-js';

// ============================================
// SETUP INSTRUCTIONS:
// 1. Go to https://supabase.com → Create new project
// 2. Choose region: South Asia (Mumbai) for India
// 3. Copy your Project URL and anon key
// 4. Create a .env file in the root with:
//    VITE_SUPABASE_URL=https://your-project.supabase.co
//    VITE_SUPABASE_ANON_KEY=your-anon-key
// 5. Run the SQL from supabase/schema.sql in the SQL Editor
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not found. Running in local-only mode.\n' +
    'To connect to Supabase, create a .env file with:\n' +
    '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;
