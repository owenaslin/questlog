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
  params: Promise<{ id: string }>;
}

export default async function QuestlineDetailPage({ params }: PageProps) {
  const { id } = await params;
  const questline = getQuestlineById(id);

  if (!questline) {
    notFound();
  }

  return <QuestlineDetailClient questline={questline} />;
}
