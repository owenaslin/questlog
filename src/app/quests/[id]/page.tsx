import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ALL_QUESTS } from "@/lib/quests";
import { Quest } from "@/lib/types";
import QuestDetailClient from "./QuestDetailClient";

// Allow unknown IDs (user-created quests) to render dynamically
export const dynamicParams = true;

export function generateStaticParams() {
  return ALL_QUESTS.map((quest) => ({ id: quest.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuestDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fast path — predefined quests
  const predefined = ALL_QUESTS.find((q) => q.id === id);
  if (predefined) return <QuestDetailClient quest={predefined} />;

  // Fallback — user/AI-created quests stored in DB (accessible via anon + RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { persistSession: false } }
  );

  const { data } = await supabase
    .from("quests")
    .select(
      "id,title,description,type,source,difficulty,xp_reward,duration_label,category,location,user_id,created_at,status"
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <QuestDetailClient quest={data as Quest} />;
}
