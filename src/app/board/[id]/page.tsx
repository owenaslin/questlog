import { notFound } from "next/navigation";
import { ALL_QUESTS } from "@/lib/quests";
import { Quest } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";
import QuestDetailClient from "@/app/board/[id]/QuestDetailClient";

export const dynamicParams = true;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  if (!UUID_RE.test(id)) notFound();

  // Cookie-bound SSR client so RLS enforces ownership: the quests policy is
  // `source = 'predefined' OR user_id = auth.uid()`, which means anon sees
  // nothing here (predefined was handled above) and authed users only see
  // their own. Previously this used the service-role client and leaked any
  // quest by UUID.
  const supabase = await createClient();

  const { data } = await supabase
    .from("quests")
    .select(
      "id,title,description,type,source,difficulty,xp_reward,duration_label,duration_minutes,steps,category,location,user_id,created_at,status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <QuestDetailClient quest={data as Quest} />;
}
