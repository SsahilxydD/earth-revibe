import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Supabase Admin client — uses the service_role key for full access.
 * Lazy-initialized to avoid module-load timing issues.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
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

let _supabaseAnon: SupabaseClient | null = null;

/**
 * Supabase Anon client — uses the anon key for user-scoped operations
 * like signInWithPassword, signUp, etc.
 */
export function getSupabaseAnon(): SupabaseClient {
  if (!_supabaseAnon) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
    }
    _supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAnon;
}
