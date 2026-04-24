import { getSupabaseClient } from "@/lib/supabase";
import { HeroProfile, PinnedQuest } from "@/lib/types";
import { getCurrentUserId } from "@/lib/quest-progress";

/* ── Public reads (no auth required) ────────────────────────────────── */

export async function getHeroByHandle(handle: string): Promise<HeroProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_profile_by_handle", {
    p_handle: handle,
  });

  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as HeroProfile;
}

export async function getHeroPinnedQuests(userId: string): Promise<PinnedQuest[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pinned_quests")
    .select("id,quest_id,quest_title,quest_type,quest_xp_reward,position,pinned_at")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .limit(5);

  if (error || !data) return [];
  return data as PinnedQuest[];
}

/** Consolidated dashboard query — replaces the old individual badge/count/streak queries */
export interface HeroDashboard {
  pinnedQuests: PinnedQuest[];
  badgeIds: string[];
  completedCount: number;
  longestStreak: number;
}

export async function getHeroDashboard(userId: string): Promise<HeroDashboard> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_hero_dashboard", {
    p_user_id: userId,
  });

  if (error || !data) {
    return {
      pinnedQuests: [],
      badgeIds: [],
      completedCount: 0,
      longestStreak: 0,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    pinnedQuests: (row.pinned_quests || []) as PinnedQuest[],
    badgeIds: (row.badge_ids || []) as string[],
    completedCount: Number(row.completed_count) || 0,
    longestStreak: Number(row.longest_streak) || 0,
  };
}

/* ── Owner reads (auth required) ─────────────────────────────────────── */

export async function getOwnHeroProfile(): Promise<HeroProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,handle,avatar_sprite,is_public,title,xp_total,level,created_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as HeroProfile;
}

export async function getOwnPinnedQuests(): Promise<PinnedQuest[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return getHeroPinnedQuests(userId);
}

/* ── Owner writes ─────────────────────────────────────────────────────── */

export interface HeroUpdatePayload {
  handle?: string | null;
  avatar_sprite?: string;
  is_public?: boolean;
  title?: string | null;
}

export async function updateHeroProfile(
  payload: HeroUpdatePayload
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function pinQuest(
  questId: string,
  questTitle: string,
  questType: "main" | "side",
  questXpReward: number
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = getSupabaseClient();

  // Find next position
  const { data: existing } = await supabase
    .from("pinned_quests")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = existing && existing.length > 0 ? (existing[0].position + 1) : 0;

  const { error } = await supabase
    .from("pinned_quests")
    .upsert(
      {
        user_id: userId,
        quest_id: questId,
        quest_title: questTitle,
        quest_type: questType,
        quest_xp_reward: questXpReward,
        position: nextPos,
      },
      { onConflict: "user_id,quest_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function unpinQuest(
  questId: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated." };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("pinned_quests")
    .delete()
    .eq("user_id", userId)
    .eq("quest_id", questId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("is_handle_available", {
    p_handle: handle,
  });
  if (error) return false;
  return Boolean(data);
}
