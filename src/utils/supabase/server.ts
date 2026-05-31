import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// SSR Supabase client for Server Components / Route Handlers. Uses the
// publishable (anon) key and the user's session cookies, so all queries
// run under RLS as the logged-in user (or anon if not signed in). Prefer
// this over the service-role client unless you genuinely need to bypass RLS.
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // cookies().set() throws when called from a Server Component;
          // the middleware refresh path covers this case.
        }
      },
    },
  });
}
