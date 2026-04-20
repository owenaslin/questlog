import { Metadata } from "next";
import HeroPageClient from "./HeroPageClient";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;

  let displayName = handle;
  let level = 1;
  let xpTotal = 0;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_profile_by_handle`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_handle: handle }),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const hero = Array.isArray(data) ? data[0] : data;
      if (hero) {
        displayName = hero.display_name ?? handle;
        level = hero.level ?? 1;
        xpTotal = hero.xp_total ?? 0;
      }
    }
  } catch {
    // fall through to defaults
  }

  const title = `${displayName} — tavrn`;
  const description = `Level ${level} adventurer with ${xpTotal.toLocaleString()} XP. View their hero page on tavrn.`;
  const ogImage = `https://tarvn.xyz/api/og/hero/${handle}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://tarvn.xyz/hero/${handle}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${displayName}'s Hero Card` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function HeroPage() {
  return <HeroPageClient />;
}
