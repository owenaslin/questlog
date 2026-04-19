import { notFound } from "next/navigation";
import { ALL_QUESTS } from "@/lib/quests";
import QuestDetailClient from "@/app/quests/[id]/QuestDetailClient";

export function generateStaticParams() {
  return ALL_QUESTS.map((quest) => ({ id: quest.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardQuestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const quest = ALL_QUESTS.find((q) => q.id === id);
  if (!quest) notFound();
  return <QuestDetailClient quest={quest} />;
}
