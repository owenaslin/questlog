import { notFound } from "next/navigation";
import { ALL_QUESTS } from "@/lib/quests";
import QuestDetailClient from "./QuestDetailClient";

// Generate static params for all quests at build time
export function generateStaticParams() {
  return ALL_QUESTS.map((quest) => ({
    id: quest.id,
  }));
}

interface PageProps {
  params: { id: string };
}

export default function QuestDetailPage({ params }: PageProps) {
  const quest = ALL_QUESTS.find((q) => q.id === params.id);

  if (!quest) {
    notFound();
  }

  return <QuestDetailClient quest={quest} />;
}
