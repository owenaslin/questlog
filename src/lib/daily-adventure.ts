import { getTodayString } from "@/lib/habit-recurrence";
import { getSupabaseClient } from "@/lib/supabase";
import { ALL_QUESTS } from "@/lib/quests";
import { getUserDashboardSnapshot, getUserCreatedActiveQuests } from "@/lib/quest-progress";
import { getUserSettings } from "@/lib/settings";
import { DailyAdventure, Quest } from "@/lib/types";
import { getRecommendedSideQuest } from "@/lib/quest-recommendations";

const REFLECTION_PROMPTS = [
  "What did you learn today?",
  "What gave you energy?",
  "What should tomorrow's quest be?",
  "What small win is worth remembering?",
  "What would make tomorrow easier?",
];

function promptForDate(date: string): string {
  const seed = date.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return REFLECTION_PROMPTS[seed % REFLECTION_PROMPTS.length];
}

function normalizeDailyAdventure(row: Record<string, unknown>): DailyAdventure {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    adventure_date: String(row.adventure_date),
    main_quest_id: typeof row.main_quest_id === "string" ? row.main_quest_id : null,
    side_quest_id: typeof row.side_quest_id === "string" ? row.side_quest_id : null,
    generated_prompt: String(row.generated_prompt || promptForDate(String(row.adventure_date))),
    reflection_answer: typeof row.reflection_answer === "string" ? row.reflection_answer : null,
    side_quest_rerolls_used: Number(row.side_quest_rerolls_used) || 0,
    completed_at: typeof row.completed_at === "string" ? row.completed_at : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export interface DailyAdventureLoadout {
  adventure: DailyAdventure;
  mainQuest: Quest | null;
  sideQuest: Quest | null;
  activeSideQuests: Quest[];
}

export async function resolveQuestById(questId: string | null): Promise<Quest | null> {
  if (!questId) return null;

  const predefined = ALL_QUESTS.find((q) => q.id === questId);
  if (predefined) return predefined;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quests")
    .select("id,title,description,type,source,difficulty,xp_reward,duration_label,duration_minutes,steps,category,location,status,user_id,created_at")
    .eq("id", questId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Quest;
}

async function createDailyAdventure(userId: string, mainQuestId: string | null, sideQuestId: string | null): Promise<DailyAdventure | null> {
  const supabase = getSupabaseClient();
  const today = getTodayString();
  const { data, error } = await supabase
    .from("daily_adventures")
    .insert({
      user_id: userId,
      adventure_date: today,
      main_quest_id: mainQuestId,
      side_quest_id: sideQuestId,
      generated_prompt: promptForDate(today),
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return normalizeDailyAdventure(data as Record<string, unknown>);
}

export async function getOrCreateTodayAdventure(): Promise<DailyAdventureLoadout | null> {
  const supabase = getSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
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
  const allActiveQuests = [
    ...activePredefined.map((quest) => ({ ...quest, status: "active" as const })),
    ...customActive,
  ];
  const mainQuest = allActiveQuests.find((quest) => quest.type === "main") ?? null;
  const activeSideQuests = allActiveQuests.filter((quest) => quest.type === "side");

  const { data: existing } = await supabase
    .from("daily_adventures")
    .select("*")
    .eq("user_id", userId)
    .eq("adventure_date", today)
    .maybeSingle();

  if (existing) {
    const adventure = normalizeDailyAdventure(existing as Record<string, unknown>);
    return {
      adventure,
      mainQuest,
      sideQuest: await resolveQuestById(adventure.side_quest_id),
      activeSideQuests,
    };
  }

  const completedIds = Object.entries(progressMap)
    .filter(([, progress]) => progress.status === "completed")
    .map(([id]) => id);
  const recommendation = await getRecommendedSideQuest({
    preferences: settingsResult.settings ?? undefined,
    excludeQuestIds: [...completedIds, ...Array.from(activeIdSet)],
  });
  const adventure = await createDailyAdventure(userId, mainQuest?.id ?? null, recommendation?.quest.id ?? null);

  if (!adventure) return null;

  return {
    adventure,
    mainQuest,
    sideQuest: recommendation?.quest ?? null,
    activeSideQuests,
  };
}

export async function rerollTodaySideQuest(): Promise<{ success: boolean; loadout?: DailyAdventureLoadout; error?: string }> {
  const supabase = getSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { success: false, error: "Please log in." };

  const loadout = await getOrCreateTodayAdventure();
  if (!loadout) return { success: false, error: "Could not load today's adventure." };
  if (loadout.adventure.side_quest_rerolls_used >= 1) {
    return { success: false, error: "You've already used today's reroll." };
  }

  const snapshot = await getUserDashboardSnapshot();
  const progressMap = snapshot?.progressMap ?? {};
  const excluded = Object.entries(progressMap)
    .filter(([, progress]) => progress.status === "completed" || progress.status === "active")
    .map(([id]) => id);
  if (loadout.adventure.side_quest_id) excluded.push(loadout.adventure.side_quest_id);

  const settingsResult = await getUserSettings();
  const recommendation = await getRecommendedSideQuest({
    preferences: settingsResult.settings ?? undefined,
    excludeQuestIds: excluded,
  });

  if (!recommendation) return { success: false, error: "No fresh side quest found." };

  const { error } = await supabase
    .from("daily_adventures")
    .update({
      side_quest_id: recommendation.quest.id,
      side_quest_rerolls_used: loadout.adventure.side_quest_rerolls_used + 1,
    })
    .eq("id", loadout.adventure.id)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  const refreshed = await getOrCreateTodayAdventure();
  return refreshed ? { success: true, loadout: refreshed } : { success: false, error: "Could not reload adventure." };
}

export async function saveTodayReflection(answer: string): Promise<{ success: boolean; error?: string }> {
  const loadout = await getOrCreateTodayAdventure();
  if (!loadout) return { success: false, error: "Could not load today's adventure." };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("daily_adventures")
    .update({ reflection_answer: answer.trim() || null })
    .eq("id", loadout.adventure.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
