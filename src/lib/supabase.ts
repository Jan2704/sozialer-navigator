
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Falls back to a harmless placeholder instead of throwing at module load —
// a missing key must not crash the whole page (e.g. calculator hydration)
// for features that don't touch Supabase at all. Calls against the
// placeholder will fail at the network layer instead of at import time.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
