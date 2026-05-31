import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const isBrowser = typeof window !== "undefined";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
        flowType: "pkce",
      },
    });
  }
  return supabaseClient;
}

// Service-role client deliberately removed — every server-side read should
// go through the cookie-bound SSR helper in src/utils/supabase/server.ts
// and let RLS enforce ownership. Reintroduce only with a clear, audited
// need (and never on a route that returns data by client-supplied id).
