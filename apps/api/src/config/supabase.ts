import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Supabase Admin client — used for Storage only (image uploads).
 * Auth is handled by our own JWT system.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage');
    }
    _supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}
