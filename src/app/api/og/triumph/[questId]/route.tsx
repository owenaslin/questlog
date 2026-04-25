import { ImageResponse } from "next/og";
import { AVATAR_PORTRAITS, AvatarKey } from "@/lib/types";

export const runtime = "edge";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

async function fetchHeroByHandle(handle: string) {
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

async function fetchQuest(questId: string) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/quests?id=eq.${questId}&select=*`,
      {
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      }
    );
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
  request: Request,
  { params }: { params: Promise<{ questId: string }> }
) {
  const { questId } = await params;
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("user") ?? "adventurer";

  const [heroData, questData, fontData] = await Promise.all([
    fetchHeroByHandle(handle),
    fetchQuest(questId),
    loadFont(),
  ]);

  const hero = heroData ?? {
    display_name: handle,
    avatar_sprite: "wizard",
    level: 1,
  };

  const quest = questData ?? {
    title: "Unknown Quest",
    xp_reward: 0,
    type: "side",
  };

  const portrait = AVATAR_PORTRAITS[hero.avatar_sprite as AvatarKey] ?? AVATAR_PORTRAITS.wizard;

  const fontConfig = fontData
    ? { name: "Press Start 2P", data: fontData, weight: 400 as const, style: "normal" as const }
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          background: "linear-gradient(135deg, #1a1208 0%, #2a1a0a 50%, #1a1208 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: fontConfig ? "Press Start 2P" : "monospace",
        }}
      >
        {/* Hearth icons */}
        <div style={{ position: "absolute", top: 40, left: 40, fontSize: 60 }}>🔥</div>
        <div style={{ position: "absolute", top: 40, right: 40, fontSize: 60 }}>🔥</div>

        {/* Triumph badge */}
        <div
          style={{
            background: "#e8b864",
            color: "#1a1208",
            padding: "12px 32px",
            fontSize: 28,
            marginBottom: 30,
            boxShadow: "4px 4px 0 #5c3a1a",
          }}
        >
          TRIUMPH!
        </div>

        {/* Hero portrait */}
        <div
          style={{
            fontSize: 80,
            marginBottom: 20,
            filter: "drop-shadow(4px 4px 0 #5c3a1a)",
          }}
        >
          {portrait.emoji}
        </div>

        {/* Hero name */}
        <div
          style={{
            color: "#e8b864",
            fontSize: 24,
            marginBottom: 8,
          }}
        >
          {hero.display_name}
        </div>

        <div
          style={{
            color: "#a08c6a",
            fontSize: 16,
            marginBottom: 30,
          }}
        >
          Level {hero.level} Adventurer
        </div>

        {/* Quest title */}
        <div
          style={{
            color: "#e8d4a0",
            fontSize: 32,
            maxWidth: "900",
            textAlign: "center",
            lineHeight: 1.4,
            marginBottom: 20,
          }}
        >
          {quest.title}
        </div>

        {/* XP earned */}
        <div
          style={{
            color: "#e8b864",
            fontSize: 48,
            marginBottom: 30,
          }}
        >
          +{quest.xp_reward} XP
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            color: "#6b5a4e",
            fontSize: 16,
          }}
        >
          tarvn.xyz/hero/{handle}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontConfig ? [fontConfig] : undefined,
    }
  );
}
