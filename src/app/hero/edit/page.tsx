"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import HeroPortrait, { PortraitPicker } from "@/components/HeroPortrait";
import XPBar from "@/components/XPBar";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthUrl } from "@/lib/auth-redirect";
import { AvatarKey, HeroProfile, PinnedQuest, deriveTitle } from "@/lib/types";
import {
  getOwnHeroProfile,
  getOwnPinnedQuests,
  updateHeroProfile,
  pinQuest,
  unpinQuest,
  isHandleAvailable,
} from "@/lib/hero";
import { getUserQuestProgressMap, getRecentCompletedQuestIds } from "@/lib/quest-progress";
import { ALL_QUESTS } from "@/lib/quests";
import { Quest } from "@/lib/types";

const HANDLE_RE = /^[a-z0-9][a-z0-9\-]{1,18}[a-z0-9]$/;

export default function HeroEditPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError]           = useState<string | null>(null);
  const [hero, setHero]                     = useState<HeroProfile | null>(null);

  // Form state
  const [handle, setHandle]         = useState("");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [avatarSprite, setAvatarSprite] = useState<AvatarKey>("wizard");
  const [isPublic, setIsPublic]     = useState(true);

  // Pinned triumphs
  const [pinnedQuests, setPinnedQuests]       = useState<PinnedQuest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [pinWorking, setPinWorking]           = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving]   = useState(false);
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ── Auth + load ─────────────────────────────────────────────── */
  useEffect(() => {
    const supabase = getSupabaseClient();
    let alive = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.replace(buildAuthUrl("login", pathname || "/hero/edit"));
        return;
      }
      if (!alive) return;

      const [heroData, pinned, progressMap, recentIds] = await Promise.all([
        getOwnHeroProfile(),
        getOwnPinnedQuests(),
        getUserQuestProgressMap(),
        getRecentCompletedQuestIds(20),
      ]);

      if (!alive) return;

      if (heroData) {
        setHero(heroData);
        setHandle(heroData.handle ?? "");
        setAvatarSprite((heroData.avatar_sprite as AvatarKey) ?? "wizard");
        setIsPublic(heroData.is_public);
      }

      setPinnedQuests(pinned);

      // Build completed quest list for the pin picker
      const merged = ALL_QUESTS.map((q) => ({
        ...q,
        status: progressMap[q.id]?.status ?? q.status,
      }));
      const completedById = new Map(
        merged.filter((q) => q.status === "completed").map((q) => [q.id, q])
      );
      setCompletedQuests(
        recentIds.map((id) => completedById.get(id)).filter((q): q is Quest => Boolean(q))
      );

      setIsCheckingAuth(false);
    };

    init().catch((err) => {
      if (alive) { setAuthError(err.message); setIsCheckingAuth(false); }
    });
    return () => { alive = false; };
  }, [pathname, router]);

  /* ── Handle validation (debounced) ──────────────────────────── */
  useEffect(() => {
    if (handle === (hero?.handle ?? "")) { setHandleStatus("idle"); return; }
    if (handle === "") { setHandleStatus("idle"); return; }
    if (!HANDLE_RE.test(handle)) { setHandleStatus("invalid"); return; }

    setHandleStatus("checking");
    const t = setTimeout(async () => {
      const available = await isHandleAvailable(handle);
      setHandleStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(t);
  }, [handle, hero?.handle]);

  /* ── Save profile ─────────────────────────────────────────────── */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    setSaveError(null);

    if (handle && !HANDLE_RE.test(handle)) {
      setSaveError("Handle must be 3–20 lowercase letters, numbers, or hyphens.");
      setIsSaving(false);
      return;
    }
    if (handleStatus === "taken") {
      setSaveError("That handle is already taken.");
      setIsSaving(false);
      return;
    }

    const result = await updateHeroProfile({
      handle: handle || null,
      avatar_sprite: avatarSprite,
      is_public: isPublic,
    });

    if (result.success) {
      setHero((prev) => prev ? { ...prev, handle: handle || null, avatar_sprite: avatarSprite, is_public: isPublic } : prev);
      setSaveMsg("Hero saved!");
    } else {
      setSaveError(result.error ?? "Save failed.");
    }
    setIsSaving(false);
  };

  /* ── Pin / unpin ─────────────────────────────────────────────── */
  const togglePin = useCallback(async (quest: Quest) => {
    const alreadyPinned = pinnedQuests.some((p) => p.quest_id === quest.id);
    setPinWorking(quest.id);

    if (alreadyPinned) {
      await unpinQuest(quest.id);
      setPinnedQuests((prev) => prev.filter((p) => p.quest_id !== quest.id));
    } else {
      if (pinnedQuests.length >= 5) { setPinWorking(null); return; }
      const result = await pinQuest(quest.id, quest.title, quest.type, quest.xp_reward);
      if (result.success) {
        setPinnedQuests((prev) => [
          ...prev,
          {
            id: `tmp-${quest.id}`,
            quest_id: quest.id,
            quest_title: quest.title,
            quest_type: quest.type,
            quest_xp_reward: quest.xp_reward,
            position: prev.length,
            pinned_at: new Date().toISOString(),
          },
        ]);
      }
    }
    setPinWorking(null);
  }, [pinnedQuests]);

  /* ── Loading / error states ──────────────────────────────────── */
  if (isCheckingAuth) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="tavern-card p-6 animate-pulse">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-tavern-smoke" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 bg-tavern-smoke" />
              <div className="h-2 w-full bg-tavern-smoke" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="tavern-card p-6 text-center">
          <p className="font-pixel text-tavern-ember text-[9px] mb-4">{authError}</p>
          <button onClick={() => router.replace(buildAuthUrl("login", "/hero/edit"))}
            className="font-pixel text-[8px] px-4 py-2 bg-retro-blue text-retro-white">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = hero?.title ?? deriveTitle(null, hero?.level ?? 1);

  return (
    <div className="max-w-lg mx-auto">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🧙</span>
        <div>
          <h1 className="font-pixel text-tavern-gold text-sm">Edit Hero</h1>
          <p className="font-pixel text-tavern-smoke-light text-[7px] mt-0.5">
            Your public character sheet
          </p>
        </div>
      </div>

      {/* ── Preview card ─────────────────────────────────────────── */}
      <div className="tavern-card p-5 mb-6">
        <p className="font-pixel text-tavern-smoke-light text-[7px] mb-3 uppercase tracking-wider">Preview</p>
        <div className="flex items-center gap-4">
          <HeroPortrait spriteKey={avatarSprite} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-pixel text-tavern-gold text-[11px] mb-0.5">
              {hero?.display_name ?? "Adventurer"}
            </p>
            <p className="font-pixel text-tavern-parchment text-[7px] mb-2 opacity-80">
              {displayTitle}
            </p>
            <p className="font-pixel text-tavern-smoke-light text-[7px] mb-2">
              Level {hero?.level ?? 1} · {hero?.xp_total ?? 0} XP
            </p>
            <XPBar xpTotal={hero?.xp_total ?? 0} showLabel={false} />
            {handle && (
              <p className="font-pixel text-tavern-smoke-light text-[6px] mt-2">
                tarvn.xyz/hero/{handle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Handle ──────────────────────────────────────────────── */}
      <div className="tavern-card p-5 mb-4">
        <label className="font-pixel text-tavern-gold text-[8px] block mb-2">
          Hero Handle
        </label>
        <p className="font-pixel text-tavern-smoke-light text-[7px] mb-3">
          Your public URL: tarvn.xyz/hero/<strong className="text-tavern-parchment">{handle || "your-handle"}</strong>
        </p>
        <div className="flex gap-2 items-start">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ""))}
            placeholder="the-iron-mage"
            maxLength={20}
            className="flex-1 font-pixel text-[8px] px-3 py-2 bg-tavern-smoke border-2 border-tavern-oak text-tavern-parchment focus:border-tavern-gold outline-none"
          />
        </div>
        <div className="mt-2 h-4">
          {handleStatus === "checking" && (
            <span className="font-pixel text-tavern-smoke-light text-[7px] animate-flicker">Checking…</span>
          )}
          {handleStatus === "available" && (
            <span className="font-pixel text-retro-lime text-[7px]">✓ Available!</span>
          )}
          {handleStatus === "taken" && (
            <span className="font-pixel text-tavern-ember text-[7px]">✗ Already taken</span>
          )}
          {handleStatus === "invalid" && (
            <span className="font-pixel text-tavern-ember text-[7px]">
              3–20 chars, lowercase a-z, 0-9 and hyphens only
            </span>
          )}
        </div>
      </div>

      {/* ── Portrait picker ─────────────────────────────────────── */}
      <div className="tavern-card p-5 mb-4">
        <label className="font-pixel text-tavern-gold text-[8px] block mb-3">
          Choose Your Portrait
        </label>
        <PortraitPicker selected={avatarSprite} onSelect={setAvatarSprite} />
      </div>

      {/* ── Visibility toggle ────────────────────────────────────── */}
      <div className="tavern-card p-5 mb-4">
        <label className="font-pixel text-tavern-gold text-[8px] block mb-3">
          Visibility
        </label>
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setIsPublic(val)}
              className={`font-pixel text-[8px] px-4 py-2 border-2 transition-none ${
                isPublic === val
                  ? "border-tavern-gold text-tavern-gold bg-tavern-smoke"
                  : "border-tavern-oak text-tavern-parchment hover:border-tavern-gold"
              }`}
            >
              {val ? "🌐 Public" : "🔒 Private"}
            </button>
          ))}
        </div>
        <p className="font-pixel text-tavern-smoke-light text-[7px] mt-2">
          {isPublic
            ? "Anyone with your link can view your hero page."
            : "Only you can view your hero page."}
        </p>
      </div>

      {/* ── Pinned Triumphs picker ───────────────────────────────── */}
      <div className="tavern-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="font-pixel text-tavern-gold text-[8px]">
            Pinned Triumphs
          </label>
          <span className="font-pixel text-tavern-smoke-light text-[7px]">
            {pinnedQuests.length} / 5 pinned
          </span>
        </div>
        <p className="font-pixel text-tavern-smoke-light text-[7px] mb-3">
          Pick up to 5 completed quests to highlight on your hero page.
        </p>

        {completedQuests.length === 0 ? (
          <div className="parchment-card p-3 text-center">
            <p className="font-pixel text-tavern-parchment text-[7px]">
              Complete quests to pin them here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {completedQuests.map((quest) => {
              const isPinned = pinnedQuests.some((p) => p.quest_id === quest.id);
              const isWorking = pinWorking === quest.id;
              return (
                <div
                  key={quest.id}
                  className="flex items-center justify-between px-3 py-2"
                  style={{
                    border: `2px solid ${isPinned ? "#e8b864" : "#5c3a1a"}`,
                    background: isPinned ? "#2a1f0a" : "#17130a",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-pixel text-tavern-gold text-[9px]">
                      {isPinned ? "📌" : "✓"}
                    </span>
                    <span className="font-pixel text-tavern-parchment text-[7px] truncate">
                      {quest.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePin(quest)}
                    disabled={isWorking || (!isPinned && pinnedQuests.length >= 5)}
                    className={`font-pixel text-[6px] px-2 py-1 border flex-shrink-0 ml-2 transition-none ${
                      isPinned
                        ? "border-tavern-ember text-tavern-ember hover:bg-tavern-smoke"
                        : "border-tavern-oak text-tavern-parchment hover:border-tavern-gold"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isWorking ? "…" : isPinned ? "Unpin" : "Pin"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Save button ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-8">
        {saveMsg && (
          <div className="parchment-card px-4 py-2 text-center">
            <span className="font-pixel text-retro-lime text-[8px]">✓ {saveMsg}</span>
          </div>
        )}
        {saveError && (
          <div className="tavern-card px-4 py-2 text-center border-tavern-ember">
            <span className="font-pixel text-tavern-ember text-[8px]">✗ {saveError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || handleStatus === "taken" || handleStatus === "invalid"}
          className="w-full font-pixel text-[9px] px-6 py-3 border-4 border-b-8 border-tavern-gold-dark bg-tavern-gold text-tavern-smoke hover:bg-tavern-candle disabled:opacity-50 disabled:cursor-not-allowed transition-none"
        >
          {isSaving ? "Saving…" : "⚔ Save Hero"}
        </button>

        {hero?.handle && (
          <Link href={`/hero/${hero.handle}`} className="block text-center">
            <span className="font-pixel text-tavern-gold text-[8px] hover:text-tavern-candle underline">
              View Public Page →
            </span>
          </Link>
        )}

        <Link href="/journal" className="block text-center">
          <span className="font-pixel text-tavern-smoke-light text-[7px] hover:text-tavern-parchment">
            ← Back to Journal
          </span>
        </Link>
      </div>
    </div>
  );
}
