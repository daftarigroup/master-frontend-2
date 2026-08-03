/**
 * Re-export from @/lib/supabase so both import paths work identically.
 * @/core/supabase  ->  @/lib/supabase  ->  REST adapter
 */
export { supabase, supabaseEnabled } from '@/lib/supabase';
