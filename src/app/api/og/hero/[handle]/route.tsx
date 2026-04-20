import { ImageResponse } from "next/og";
import { AVATAR_PORTRAITS, AvatarKey, deriveTitle } from "@/lib/types";

export const runtime = "edge";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

async function fetchHero(handle: string) {
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

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff"
    );
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const [heroData, fontData] = await Promise.all([fetchHero(handle), loadFont()]);

  const hero = heroData ?? {
    display_name: handle,
    avatar_sprite: "wizard",
    level: 1,
    xp_total: 0,
    title: null,
  };

  const portrait = AVATAR_PORTRAITS[hero.avatar_sprite as AvatarKey] ?? AVATAR_PORTRAITS.wizard;
  const displayTitle = hero.title ?? deriveTitle(null, hero.level);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#1a1208",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontData ? "PressStart2P" : "monospace",
          position: "relative",
          borderWidth: 8,
          borderStyle: "solid",
          borderColor: "#5c3a1a",
        }}
      >
        {/* Warm vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(232,184,100,0.18) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Avatar portrait */}
        <div
          style={{
            width: 160,
            height: 160,
            background: portrait.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 80,
            borderWidth: 6,
            borderStyle: "solid",
            borderColor: "#e8b864",
            marginBottom: 28,
            zIndex: 1,
          }}
        >
          {portrait.emoji}
        </div>

        {/* Display name */}
        <div
          style={{
            color: "#e8b864",
            fontSize: fontData ? 44 : 52,
            marginBottom: 14,
            zIndex: 1,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          {hero.display_name}
        </div>

        {/* Title */}
        <div
          style={{
            color: "#e8d4a0",
            fontSize: fontData ? 18 : 22,
            marginBottom: 40,
            opacity: 0.85,
            zIndex: 1,
          }}
        >
          {displayTitle}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 64, zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#e8b864", fontSize: fontData ? 32 : 38 }}>
              Lv. {hero.level}
            </div>
            <div style={{ color: "#6b5a4e", fontSize: 14, marginTop: 8 }}>
              Level
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#73eff7", fontSize: fontData ? 32 : 38 }}>
              {hero.xp_total.toLocaleString()} XP
            </div>
            <div style={{ color: "#6b5a4e", fontSize: 14, marginTop: 8 }}>
              Experience
            </div>
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            color: "#4a3f35",
            fontSize: 18,
            display: "flex",
            zIndex: 1,
          }}
        >
          🍺 tarvn.xyz/hero/{handle}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fontData
        ? { fonts: [{ name: "PressStart2P", data: fontData, style: "normal" as const }] }
        : {}),
    }
  );
}
