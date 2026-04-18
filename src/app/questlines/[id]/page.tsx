import { notFound } from "next/navigation";
import { QUESTLINES, getQuestlineById } from "@/lib/questlines";
import QuestlineDetailClient from "./QuestlineDetailClient";

// Generate static params for all questlines at build time
export function generateStaticParams() {
  return QUESTLINES.map((questline) => ({
    id: questline.id,
  }));
}

interface PageProps {
  params: { id: string };
}

export default function QuestlineDetailPage({ params }: PageProps) {
  const questline = getQuestlineById(params.id);

  if (!questline) {
    notFound();
  }

  return <QuestlineDetailClient questline={questline} />;
}
