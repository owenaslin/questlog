export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export async function fetchHeroByHandle(handle: string) {
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
