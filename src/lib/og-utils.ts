export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** RFC 4122 UUID format check. Used to validate path params before they reach the DB. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate a public profile handle. Mirrors the DB-side constraint in
 * supabase/migrations/007_security_hardening.sql so invalid handles are rejected
 * before being interpolated into URLs or sent to PostgREST. Case-insensitive:
 * handles are stored lowercase and get_profile_by_handle lower()s its input, so
 * mixed-case URLs (e.g. /hero/JohnDoe) must still resolve.
 */
export function isValidHandle(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/i.test(value);
}

export async function fetchHeroByHandle(handle: string) {
  if (!isValidHandle(handle)) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_profile_by_handle`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_handle: handle }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
}

export async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff"
    );
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
