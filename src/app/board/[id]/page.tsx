import { notFound } from "next/navigation";
import { ALL_QUESTS } from "@/lib/quests";
import { Quest } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase";
import QuestDetailClient from "@/app/quests/[id]/QuestDetailClient";

export const dynamicParams = true;

export function generateStaticParams() {
  return ALL_QUESTS.map((quest) => ({ id: quest.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardQuestDetailPage({ params }: PageProps) {
  const { id } = await params;

  const predefined = ALL_QUESTS.find((q) => q.id === id);
  if (predefined) return <QuestDetailClient quest={predefined} />;

  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("quests")
    .select(
      "id,title,description,type,source,difficulty,xp_reward,duration_label,duration_minutes,steps,category,location,user_id,created_at,status"
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <QuestDetailClient quest={data as Quest} />;
}
