import { getTodayString } from "@/lib/habit-recurrence";
import { getSupabaseClient } from "@/lib/supabase";
import { ALL_QUESTS } from "@/lib/quests";
import { getUserDashboardSnapshot, getUserCreatedActiveQuests } from "@/lib/quest-progress";
import { getUserSettings } from "@/lib/settings";
import { DailyAdventure, Quest } from "@/lib/types";
import { getRecommendedSideQuest } from "@/lib/quest-recommendations";

function normalizeDailyAdventure(row: Record<string, unknown>): DailyAdventure {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    adventure_date: String(row.adventure_date),
    suggested_quest_id: typeof row.side_quest_id === "string" ? row.side_quest_id : null,
    side_quest_rerolls_used: Number(row.side_quest_rerolls_used) || 0,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  return authData.user?.id ?? null;
}

export interface DailyAdventureLoadout {
  adventure: DailyAdventure;
  activeQuests: Quest[];
  suggestedQuest: Quest | null;
  completedQuestIds: string[];
}

export async function resolveQuestById(questId: string | null): Promise<Quest | null> {
  if (!questId) return null;

  const predefined = ALL_QUESTS.find((q) => q.id === questId);
  if (predefined) return predefined;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quests")
    .select("id,title,description,source,difficulty,xp_reward,duration_label,duration_minutes,steps,category,location,status,user_id,created_at")
    .eq("id", questId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Quest;
}

async function createDailyAdventure(userId: string, suggestedQuestId: string | null): Promise<DailyAdventure | null> {
  const supabase = getSupabaseClient();
  const today = getTodayString();
  const { data, error } = await supabase
    .from("daily_adventures")
    .upsert({
      user_id: userId,
      adventure_date: today,
      side_quest_id: suggestedQuestId,
      generated_prompt: "",
    }, { onConflict: "user_id,adventure_date" })
    .select("*")
    .single();

  if (error || !data) return null;
  return normalizeDailyAdventure(data as Record<string, unknown>);
}

export async function getOrCreateTodayAdventure(): Promise<DailyAdventureLoadout | null> {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const today = getTodayString();
  const [snapshot, customActive, settingsResult] = await Promise.all([
    getUserDashboardSnapshot(),
    getUserCreatedActiveQuests(),
    getUserSettings(),
  ]);

  const progressMap = snapshot?.progressMap ?? {};
  const activeIdSet = new Set(
    Object.entries(progressMap)
      .filter(([, progress]) => progress.status === "active")
      .map(([id]) => id)
  );
  const activePredefined = ALL_QUESTS.filter((quest) => activeIdSet.has(quest.id));
  const activeQuests = [
    ...activePredefined.map((quest) => ({ ...quest, status: "active" as const })),
    ...customActive,
  ];

  const { data: existing } = await supabase
    .from("daily_adventures")
    .select("*")
    .eq("user_id", userId)
    .eq("adventure_date", today)
    .maybeSingle();

  const completedIds = Object.entries(progressMap)
    .filter(([, progress]) => progress.status === "completed")
    .map(([id]) => id);

  if (existing) {
    const adventure = normalizeDailyAdventure(existing as Record<string, unknown>);
    return {
      adventure,
      activeQuests,
      suggestedQuest: await resolveQuestById(adventure.suggested_quest_id),
      completedQuestIds: completedIds,
    };
  }

  const recommendation = getRecommendedSideQuest({
    preferences: settingsResult.settings ?? undefined,
    excludeQuestIds: [...completedIds, ...Array.from(activeIdSet)],
  });
  const adventure = await createDailyAdventure(userId, recommendation?.quest.id ?? null);

  if (!adventure) return null;

  return {
    adventure,
    activeQuests,
    suggestedQuest: recommendation?.quest ?? null,
    completedQuestIds: completedIds,
  };
}

export async function rerollTodaySideQuest(): Promise<{ success: boolean; loadout?: DailyAdventureLoadout; error?: string }> {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Please log in." };

  const loadout = await getOrCreateTodayAdventure();
  if (!loadout) return { success: false, error: "Could not load today's adventure." };
  if (loadout.adventure.side_quest_rerolls_used >= 1) {
    return { success: false, error: "You've already used today's reroll." };
  }

  // Use data already fetched by getOrCreateTodayAdventure
  const excluded = [
    ...loadout.activeQuests.map((q) => q.id),
    ...loadout.completedQuestIds,
  ];
  if (loadout.adventure.suggested_quest_id) excluded.push(loadout.adventure.suggested_quest_id);
  const recommendation = getRecommendedSideQuest({
    excludeQuestIds: excluded,
  });

  if (!recommendation) return { success: false, error: "No fresh quest found." };

  // Atomic update: only succeeds if rerolls_used < 1 (race-condition safe)
  const { data: updated, error } = await supabase
    .from("daily_adventures")
    .update({
      side_quest_id: recommendation.quest.id,
      side_quest_rerolls_used: loadout.adventure.side_quest_rerolls_used + 1,
    })
    .eq("id", loadout.adventure.id)
    .eq("user_id", userId)
    .lt("side_quest_rerolls_used", 1)
    .select("*")
    .single();

  if (error || !updated) {
    return { success: false, error: error?.message || "Reroll already used." };
  }

  const refreshed = await getOrCreateTodayAdventure();
  return refreshed ? { success: true, loadout: refreshed } : { success: false, error: "Could not reload adventure." };
}
