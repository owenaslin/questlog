import { v5 as uuidv5 } from "uuid";

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // UUID v5 namespace

export function generateStableId(title: string): string {
  return uuidv5(title, NAMESPACE);
}

// ─── Legacy seed data removed ────────────────────────────────────────────────
// The original SEED_QUESTS array has been superseded by the typed per-category
// files in src/lib/quests/ and has been deleted.
export const SEED_QUESTS: never[] = [];
