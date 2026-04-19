-- Migration: Badges, Questlines, and Quest Relationships
-- Run this in your Supabase SQL editor after the initial schema

-- ============================================
-- BADGES SYSTEM
-- ============================================

-- badges table: defines all earnable badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  requirement_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_badges junction: tracks which users have earned which badges
CREATE TABLE public.user_badges (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- RLS for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can view all badge definitions
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (true);

-- Users can view all user_badge entries (for leaderboard/flexing)
CREATE POLICY "Anyone can view user badges" ON public.user_badges
  FOR SELECT USING (true);

-- Users can only insert their own badges (trigger will handle this)
CREATE POLICY "System can insert user badges" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- QUESTLINES SYSTEM
-- ============================================

-- questlines table: defines quest series and skill trees
CREATE TABLE public.questlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('linear', 'skill_tree')),
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  total_xp INTEGER NOT NULL DEFAULT 0,
  badge_reward_id UUID REFERENCES public.badges(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- questline_steps table: links quests to questlines with ordering/branching
CREATE TABLE public.questline_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questline_id UUID REFERENCES public.questlines(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  step_number INTEGER, -- for linear questlines (1, 2, 3...)
  parent_step_id UUID REFERENCES public.questline_steps(id) ON DELETE SET NULL, -- for skill trees
  branch_name TEXT, -- e.g., "Web Dev", "AI/ML" for skill tree branches
  unlock_requirement TEXT DEFAULT 'complete_parent', -- 'complete_parent', 'none', custom
  is_starting_step BOOLEAN NOT NULL DEFAULT false, -- true for skill tree roots
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(questline_id, step_number),
  UNIQUE(questline_id, quest_id)
);

-- user_questline_progress table: tracks user progress through questlines
CREATE TABLE public.user_questline_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  questline_id UUID REFERENCES public.questlines(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES public.questline_steps(id),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, questline_id)
);

-- Add questline reference to quests
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS questline_id UUID REFERENCES public.questlines(id) ON DELETE SET NULL;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS is_starter_quest BOOLEAN DEFAULT false;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS is_questline_final BOOLEAN DEFAULT false;

-- RLS for questlines
ALTER TABLE public.questlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questline_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_questline_progress ENABLE ROW LEVEL SECURITY;

-- Everyone can view questlines
CREATE POLICY "Anyone can view questlines" ON public.questlines
  FOR SELECT USING (true);

-- Everyone can view questline steps
CREATE POLICY "Anyone can view questline steps" ON public.questline_steps
  FOR SELECT USING (true);

-- Users can view their own questline progress
CREATE POLICY "Users can view own questline progress" ON public.user_questline_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own questline progress
CREATE POLICY "Users can update own questline progress" ON public.user_questline_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own questline progress
CREATE POLICY "Users can insert own questline progress" ON public.user_questline_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_badges_rarity ON public.badges(rarity);
CREATE INDEX idx_badges_requirement_type ON public.badges(requirement_type);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_questlines_category ON public.questlines(category);
CREATE INDEX idx_questlines_type ON public.questlines(type);
CREATE INDEX idx_questline_steps_questline_id ON public.questline_steps(questline_id);
CREATE INDEX idx_questline_steps_parent ON public.questline_steps(parent_step_id);
CREATE INDEX idx_quests_questline_id ON public.quests(questline_id);
CREATE INDEX idx_user_questline_progress_user ON public.user_questline_progress(user_id);

-- ============================================
-- FUNCTION: Check and Award Badges
-- ============================================

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id UUID, badge_name TEXT) AS $$
DECLARE
  v_badge RECORD;
  v_requirement_met BOOLEAN;
  v_category_count INTEGER;
  v_total_quests INTEGER;
  v_questline_count INTEGER;
BEGIN
  -- Loop through all badges the user doesn't have yet
  FOR v_badge IN 
    SELECT b.* 
    FROM public.badges b
    WHERE b.id NOT IN (
      SELECT badge_id FROM public.user_badges WHERE user_id = p_user_id
    )
  LOOP
    v_requirement_met := false;
    
    CASE v_badge.requirement_type
      -- Count quests in a specific category
      WHEN 'category_count' THEN
        SELECT COUNT(*) INTO v_category_count
        FROM public.quests q
        JOIN public.user_quests uq ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id 
          AND uq.status = 'completed'
          AND q.category = v_badge.requirement_category;
        v_requirement_met := v_category_count >= v_badge.requirement_value;
        
      -- Total quests completed
      WHEN 'total_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests
        WHERE user_id = p_user_id AND status = 'completed';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;
        
      -- Questlines completed
      WHEN 'questline_complete' THEN
        SELECT COUNT(*) INTO v_questline_count
        FROM public.user_questline_progress
        WHERE user_id = p_user_id AND is_completed = true;
        v_requirement_met := v_questline_count >= v_badge.requirement_value;
        
      -- Level reached (check profiles table)
      WHEN 'level_reached' THEN
        SELECT (level >= v_badge.requirement_value) INTO v_requirement_met
        FROM public.profiles
        WHERE id = p_user_id;
        
      -- Side quests completed
      WHEN 'side_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests uq
        JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id 
          AND uq.status = 'completed'
          AND q.type = 'side';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;
        
      -- Main quests completed
      WHEN 'main_quests' THEN
        SELECT COUNT(*) INTO v_total_quests
        FROM public.user_quests uq
        JOIN public.quests q ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id 
          AND uq.status = 'completed'
          AND q.type = 'main';
        v_requirement_met := v_total_quests >= v_badge.requirement_value;
        
      -- Unique categories (count distinct categories)
      WHEN 'unique_categories' THEN
        SELECT COUNT(DISTINCT q.category) INTO v_category_count
        FROM public.quests q
        JOIN public.user_quests uq ON q.id = uq.quest_id
        WHERE uq.user_id = p_user_id AND uq.status = 'completed';
        v_requirement_met := v_category_count >= v_badge.requirement_value;
        
      -- Weekend warrior (3+ quests completed on weekend days)
      WHEN 'weekend_warrior' THEN
        -- Note: This requires tracking completion dates. Placeholder implementation.
        -- In production, track quest completions with timestamps and check day of week
        v_requirement_met := false; -- Requires timestamp tracking
        
      -- Streak days (30-day streak)
      WHEN 'streak_days' THEN
        -- Note: This requires daily quest completion tracking. Placeholder implementation.
        -- In production, track daily activity in a separate streaks table
        v_requirement_met := false; -- Requires streak tracking table
        
      -- All questlines (complete questlines in all categories)
      WHEN 'all_questlines' THEN
        SELECT COUNT(DISTINCT ql.category) INTO v_questline_count
        FROM public.user_questline_progress uqp
        JOIN public.questlines ql ON ql.id = uqp.questline_id
        WHERE uqp.user_id = p_user_id AND uqp.is_completed = true;
        -- Check if completed questlines cover all categories that have questlines
        v_requirement_met := v_questline_count >= (
          SELECT COUNT(DISTINCT category) FROM public.questlines WHERE is_active = true
        );
        
    END CASE;
    
    -- Award badge if requirement met
    IF v_requirement_met THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;
      
      RETURN QUERY SELECT v_badge.id, v_badge.name;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update questline progress
-- ============================================

CREATE OR REPLACE FUNCTION public.update_questline_progress()
RETURNS trigger AS $$
DECLARE
  v_questline_id UUID;
  v_step_id UUID;
  v_next_step RECORD;
BEGIN
  -- Only process if quest was completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Always check badge eligibility on any quest completion
    PERFORM public.check_and_award_badges(NEW.user_id);

    -- Find if this quest is part of a questline
    SELECT qs.questline_id, qs.id INTO v_questline_id, v_step_id
    FROM public.questline_steps qs
    WHERE qs.quest_id = NEW.quest_id::uuid;
    
    IF v_questline_id IS NOT NULL THEN
      -- Get the next step in the questline
      SELECT * INTO v_next_step
      FROM public.questline_steps
      WHERE questline_id = v_questline_id
        AND step_number = (
          SELECT step_number + 1 
          FROM public.questline_steps 
          WHERE id = v_step_id
        )
      LIMIT 1;
      
      -- Update user progress
      UPDATE public.user_questline_progress
      SET current_step_id = COALESCE(v_next_step.id, v_step_id),
          is_completed = (v_next_step.id IS NULL),
          completed_at = CASE WHEN v_next_step.id IS NULL THEN now() ELSE null END
      WHERE user_id = NEW.user_id 
        AND questline_id = v_questline_id;
        
      -- Questline completion state is updated above.
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on quest completion
CREATE TRIGGER on_quest_completed
  AFTER UPDATE OF status ON public.user_quests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_questline_progress();

-- ============================================
-- SEED DATA: Sample Badges
-- ============================================

-- Insert badges with conflict handling (idempotent)
INSERT INTO public.badges (key, name, description, icon, rarity, requirement_type, requirement_value, requirement_category) VALUES
  -- Common badges
  ('first_steps', 'First Steps', 'Complete your first quest', '🥾', 'common', 'total_quests', 1, NULL),
  ('jack_of_all_trades', 'Jack of All Trades', 'Complete quests in 5 different categories', '🎭', 'common', 'unique_categories', 5, NULL),
  ('weekend_warrior', 'Weekend Warrior', 'Complete 3 quests in one weekend', '🏃', 'common', 'weekend_warrior', 3, NULL),
  ('side_quest_explorer', 'Side Quest Explorer', 'Complete 10 side quests', '🗡', 'common', 'side_quests', 10, NULL),
  ('getting_started', 'Getting Started', 'Reach Level 2', '⭐', 'common', 'level_reached', 2, NULL),
  
  -- Rare badges
  ('fitness_fanatic', 'Fitness Fanatic', 'Complete 10 fitness quests', '💪', 'rare', 'category_count', 10, 'Fitness'),
  ('bookworm', 'Bookworm', 'Complete 5 education quests', '📚', 'rare', 'category_count', 5, 'Education'),
  ('creative_soul', 'Creative Soul', 'Complete 10 creative quests', '🎨', 'rare', 'category_count', 10, 'Creative'),
  ('tech_enthusiast', 'Tech Enthusiast', 'Complete 10 tech quests', '💻', 'rare', 'category_count', 10, 'Tech'),
  ('social_butterfly', 'Social Butterfly', 'Complete 5 social quests', '🦋', 'rare', 'category_count', 5, 'Social'),
  ('nature_lover', 'Nature Lover', 'Complete 5 outdoors quests', '🌲', 'rare', 'category_count', 5, 'Outdoors'),
  ('mindful_practitioner', 'Mindful Practitioner', 'Complete 5 wellness quests', '🧘', 'rare', 'category_count', 5, 'Wellness'),
  ('foodie', 'Foodie', 'Complete 5 food quests', '🍳', 'rare', 'category_count', 5, 'Food'),
  ('main_quest_hero', 'Main Quest Hero', 'Complete your first main quest', '⚔️', 'rare', 'main_quests', 1, NULL),
  ('level_5', 'Rising Star', 'Reach Level 5', '🌟', 'rare', 'level_reached', 5, NULL),
  ('quest_collector', 'Quest Collector', 'Complete 25 quests of any type', '📜', 'rare', 'total_quests', 25, NULL),
  
  -- Epic badges
  ('marathoner', 'Marathoner', 'Complete 5 main quests', '🏆', 'epic', 'main_quests', 5, NULL),
  ('questline_master', 'Questline Master', 'Complete 3 full questlines', '🗺️', 'epic', 'questline_complete', 3, NULL),
  ('renaissance', 'Renaissance', 'Complete quests in 10 different categories', '👑', 'epic', 'unique_categories', 10, NULL),
  ('category_master_fitness', 'Fitness Master', 'Complete 20 fitness quests', '🏋️', 'epic', 'category_count', 20, 'Fitness'),
  ('category_master_creative', 'Creative Master', 'Complete 20 creative quests', '🎭', 'epic', 'category_count', 20, 'Creative'),
  ('category_master_tech', 'Tech Master', 'Complete 20 tech quests', '🚀', 'epic', 'category_count', 20, 'Tech'),
  ('level_10', 'Seasoned Adventurer', 'Reach Level 10', '💎', 'epic', 'level_reached', 10, NULL),
  ('dedicated', 'Dedicated', 'Complete 50 quests total', '🔥', 'epic', 'total_quests', 50, NULL),
  
  -- Legendary badges
  ('completionist', 'Completionist', 'Complete 100 quests of any type', '👑', 'legendary', 'total_quests', 100, NULL),
  ('legend_of_the_board', 'Legend of the Board', 'Reach Level 20', '⚔️', 'legendary', 'level_reached', 20, NULL),
  ('master_of_all', 'Master of All', 'Complete questlines in all categories', '🏅', 'legendary', 'all_questlines', 1, NULL),
  ('true_hero', 'True Hero', 'Complete 25 main quests', '🦸', 'legendary', 'main_quests', 25, NULL),
  ('unstoppable', 'Unstoppable', 'Maintain a 30-day streak of completing at least one quest', '🌠', 'legendary', 'streak_days', 30, NULL)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  requirement_category = EXCLUDED.requirement_category;

-- Note: Run the INSERT statements separately in Supabase SQL editor if tables don't exist yet
