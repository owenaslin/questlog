import { Questline, QuestlineStep, Quest, Badge } from "@/lib/types";
import { generateStableId } from "@/lib/seed-quests";
import { FITNESS_QUESTS_WITH_IDS } from "./quests/fitness";
import { CREATIVE_QUESTS_WITH_IDS } from "./quests/creative";
import { TECH_QUESTS_WITH_IDS } from "./quests/tech";

// Helper to find quest by title (more stable than array indices).
// Returns null and logs an error rather than throwing so a renamed quest
// doesn't crash the whole module at load time.
function findQuestByTitle(quests: Quest[], title: string): Quest | null {
  const quest = quests.find((q) => q.title === title);
  if (!quest) {
    console.error(`[questlines] Quest not found: "${title}". Check for title changes in quest data.`);
    return null;
  }
  return quest;
}

// Step factory for cleaner questline definitions
type StepConfig = {
  quest: Quest | null; // null when findQuestByTitle can't resolve the title
  step_number: number;
  is_starting_step?: boolean;
  is_unlocked?: boolean;
  is_completed?: boolean;
  branch_name?: string;
  parent_step_id?: string;
};

function createStep({
  quest,
  step_number,
  is_starting_step = false,
  is_unlocked = false,
  is_completed = false,
  branch_name,
  parent_step_id,
}: StepConfig) {
  return {
    quest,
    step_number,
    is_starting_step,
    is_unlocked,
    is_completed,
    branch_name,
    parent_step_id,
  };
}

// ============================================
// LINEAR QUESTLINES
// ============================================

export const FITNESS_JOURNEY_QUESTLINE: Omit<Questline, "id" | "steps" | "badge_reward"> & {
  steps: (Omit<QuestlineStep, "id" | "quest" | "quest_id"> & { quest: Quest | null })[];
} = {
  title: "The Fitness Journey",
  description: "Transform your body and build lasting healthy habits through progressive challenges",
  type: "linear",
  category: "Fitness",
  difficulty: "beginner",
  total_xp: 1550,
  steps: [
    createStep({ quest: findQuestByTitle(FITNESS_QUESTS_WITH_IDS, "Morning Stretch Routine"), step_number: 1, is_starting_step: true, is_unlocked: true }),
    createStep({ quest: findQuestByTitle(FITNESS_QUESTS_WITH_IDS, "7-Day Step Challenge"), step_number: 2 }),
    createStep({ quest: findQuestByTitle(FITNESS_QUESTS_WITH_IDS, "Plank Challenge"), step_number: 3 }),
    createStep({ quest: findQuestByTitle(FITNESS_QUESTS_WITH_IDS, "Yoga Flow Session"), step_number: 4 }),
    createStep({ quest: findQuestByTitle(FITNESS_QUESTS_WITH_IDS, "HIIT Workout"), step_number: 5 }),
    createStep({ quest: findQuestByTitle(FITNESS_QUESTS_WITH_IDS, "30-Day Fitness Habit"), step_number: 6 }),
  ],
};

export const CREATIVE_MASTERY_QUESTLINE: Omit<Questline, "id" | "steps" | "badge_reward"> & {
  steps: (Omit<QuestlineStep, "id" | "quest" | "quest_id"> & { quest: Quest | null })[];
} = {
  title: "Creative Mastery",
  description: "Unlock your creative potential through daily practice and artistic exploration",
  type: "linear",
  category: "Creative",
  difficulty: "intermediate",
  total_xp: 1550,
  steps: [
    createStep({ quest: findQuestByTitle(CREATIVE_QUESTS_WITH_IDS, "Sketch Daily Object"), step_number: 1, is_starting_step: true, is_unlocked: true }),
    createStep({ quest: findQuestByTitle(CREATIVE_QUESTS_WITH_IDS, "Write a Poem"), step_number: 2 }),
    createStep({ quest: findQuestByTitle(CREATIVE_QUESTS_WITH_IDS, "Photo Walk"), step_number: 3 }),
    createStep({ quest: findQuestByTitle(CREATIVE_QUESTS_WITH_IDS, "Try Watercolor"), step_number: 4 }),
    createStep({ quest: findQuestByTitle(CREATIVE_QUESTS_WITH_IDS, "Make a Short Video"), step_number: 5 }),
    createStep({ quest: findQuestByTitle(CREATIVE_QUESTS_WITH_IDS, "30-Day Drawing Challenge"), step_number: 6 }),
  ],
};

// ============================================
// SKILL TREE QUESTLINES
// ============================================

export const TECH_MASTERY_QUESTLINE: Omit<Questline, "id" | "steps" | "badge_reward"> & {
  steps: (Omit<QuestlineStep, "id" | "quest" | "quest_id"> & { quest: Quest | null })[];
} = {
  title: "Tech Mastery",
  description: "Choose your path in technology—Web Development, AI/ML, or Game Development",
  type: "skill_tree",
  category: "Tech",
  difficulty: "advanced",
  total_xp: 2400,
  steps: [
    // Root node - everyone starts here
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Learn Git Basics"), step_number: 1, is_starting_step: true, is_unlocked: true }),
    // Web Dev Branch
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Build a Calculator App"), step_number: 2, branch_name: "Web Dev", parent_step_id: "" }),
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Deploy a Website"), step_number: 3, branch_name: "Web Dev", parent_step_id: "" }),
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Build a Portfolio Website"), step_number: 4, branch_name: "Web Dev", parent_step_id: "" }),
    // AI/ML Branch
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Automate a Task"), step_number: 2, branch_name: "AI/ML", parent_step_id: "" }),
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Create a Personal API"), step_number: 3, branch_name: "AI/ML", parent_step_id: "" }),
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Learn Machine Learning Basics"), step_number: 4, branch_name: "AI/ML", parent_step_id: "" }),
    // Game Dev Branch
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Fix a Bug in Open Source"), step_number: 2, branch_name: "Game Dev", parent_step_id: "" }),
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Create a Discord Bot"), step_number: 3, branch_name: "Game Dev", parent_step_id: "" }),
    createStep({ quest: findQuestByTitle(TECH_QUESTS_WITH_IDS, "Build a Game"), step_number: 4, branch_name: "Game Dev", parent_step_id: "" }),
  ],
};

// ============================================
// QUESTLINE REWARD BADGES
// ============================================

export const QUESTLINE_BADGES: Omit<Badge, "id" | "earned_at">[] = [
  {
    key: "fitness_journey_complete",
    name: "Fitness Journey Complete",
    description: "Complete the entire Fitness Journey questline",
    icon: "🏃",
    rarity: "epic",
    requirement_type: "questline_complete",
    requirement_value: 1,
  },
  {
    key: "creative_mastery_complete",
    name: "Creative Mastery Complete",
    description: "Complete the entire Creative Mastery questline",
    icon: "🎨",
    rarity: "epic",
    requirement_type: "questline_complete",
    requirement_value: 1,
  },
  {
    key: "tech_mastery_complete",
    name: "Tech Mastery Complete",
    description: "Complete any branch of the Tech Mastery skill tree",
    icon: "💻",
    rarity: "epic",
    requirement_type: "questline_complete",
    requirement_value: 1,
  },
];

// Helper function to create full Questline objects with IDs
export function createQuestline(
  base: Omit<Questline, "id" | "steps" | "badge_reward"> & {
    steps: (Omit<QuestlineStep, "id" | "quest" | "quest_id"> & { quest: Quest | null })[];
  },
  badgeReward?: Badge
): Questline {
  const questlineId = generateStableId(`questline-${base.title}`);

  // Filter out any steps whose quest couldn't be resolved (renamed/deleted quests).
  const validSteps = base.steps.filter((s): s is typeof s & { quest: Quest } => s.quest !== null);

  // Create steps with IDs
  const steps: QuestlineStep[] = validSteps.map((step, index) => {
    const stepId = generateStableId(`${questlineId}-step-${index}`);
    return {
      id: stepId,
      questline_id: questlineId,
      quest_id: step.quest.id,
      quest: step.quest,
      step_number: step.step_number,
      parent_step_id: step.parent_step_id,
      branch_name: step.branch_name,
      unlock_requirement: step.unlock_requirement,
      is_starting_step: step.is_starting_step,
      is_unlocked: step.is_unlocked,
      is_completed: step.is_completed,
    };
  });

  // Set parent_step_ids for skill trees
  if (base.type === "skill_tree") {
    const rootStep = steps[0];
    const webDevSteps = steps.filter((s) => s.branch_name === "Web Dev");
    const aiMlSteps = steps.filter((s) => s.branch_name === "AI/ML");
    const gameDevSteps = steps.filter((s) => s.branch_name === "Game Dev");

    // Set root as parent for all first branch steps
    if (webDevSteps[0]) webDevSteps[0].parent_step_id = rootStep.id;
    if (aiMlSteps[0]) aiMlSteps[0].parent_step_id = rootStep.id;
    if (gameDevSteps[0]) gameDevSteps[0].parent_step_id = rootStep.id;

    // Chain remaining steps in each branch
    for (let i = 1; i < webDevSteps.length; i++) {
      webDevSteps[i].parent_step_id = webDevSteps[i - 1].id;
    }
    for (let i = 1; i < aiMlSteps.length; i++) {
      aiMlSteps[i].parent_step_id = aiMlSteps[i - 1].id;
    }
    for (let i = 1; i < gameDevSteps.length; i++) {
      gameDevSteps[i].parent_step_id = gameDevSteps[i - 1].id;
    }
  }

  return {
    id: questlineId,
    title: base.title,
    description: base.description,
    type: base.type,
    category: base.category,
    difficulty: base.difficulty,
    total_xp: base.total_xp,
    steps,
    badge_reward: badgeReward,
    is_active: true,
  };
}

// Create all questlines. Wrapped in a try/catch so a single renamed quest
// title doesn't crash the whole module — QUESTLINES degrades to [] instead.
export const QUESTLINES: Questline[] = (() => {
  try {
    return [
      createQuestline(FITNESS_JOURNEY_QUESTLINE, {
        ...QUESTLINE_BADGES[0],
        id: generateStableId(`badge-${QUESTLINE_BADGES[0].key}`),
      }),
      createQuestline(CREATIVE_MASTERY_QUESTLINE, {
        ...QUESTLINE_BADGES[1],
        id: generateStableId(`badge-${QUESTLINE_BADGES[1].key}`),
      }),
      createQuestline(TECH_MASTERY_QUESTLINE, {
        ...QUESTLINE_BADGES[2],
        id: generateStableId(`badge-${QUESTLINE_BADGES[2].key}`),
      }),
    ];
  } catch (err) {
    console.error("[questlines] Failed to build questlines:", err);
    return [];
  }
})();

// Get questline by ID
export function getQuestlineById(id: string): Questline | undefined {
  return QUESTLINES.find((q) => q.id === id);
}

// Get questlines by category
export function getQuestlinesByCategory(category: string): Questline[] {
  return QUESTLINES.filter((q) => q.category.toLowerCase() === category.toLowerCase());
}

// Get all linear questlines
export function getLinearQuestlines(): Questline[] {
  return QUESTLINES.filter((q) => q.type === "linear");
}

// Get all skill trees
export function getSkillTrees(): Questline[] {
  return QUESTLINES.filter((q) => q.type === "skill_tree");
}
