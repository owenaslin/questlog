-- Migration: Add consolidated hero dashboard RPC to eliminate N+1 queries
-- This combines getHeroPinnedQuests, getHeroBadgeIds, getHeroCompletedCount, getHeroLongestStreak

CREATE OR REPLACE FUNCTION public.get_hero_dashboard(p_user_id UUID)
RETURNS TABLE (
    pinned_quests JSONB,
    badge_ids UUID[],
    completed_count BIGINT,
    longest_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH 
    pinned AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'quest_id', quest_id,
                'quest_title', quest_title,
                'quest_type', quest_type,
                'quest_xp_reward', quest_xp_reward,
                'position', position,
                'pinned_at', pinned_at
            ) ORDER BY position
        ) as data
        FROM public.pinned_quests
        WHERE user_id = p_user_id
        LIMIT 5
    ),
    badges AS (
        SELECT array_agg(badge_id) as data
        FROM public.user_badges
        WHERE user_id = p_user_id
    ),
    completed AS (
        SELECT COUNT(*) as cnt
        FROM public.user_quests
        WHERE user_id = p_user_id AND status = 'completed'
    ),
    streak AS (
        SELECT longest_streak
        FROM public.user_streaks
        WHERE user_id = p_user_id
        LIMIT 1
    )
    SELECT 
        COALESCE(pinned.data, '[]'::jsonb) as pinned_quests,
        COALESCE(badges.data, ARRAY[]::UUID[]) as badge_ids,
        COALESCE(completed.cnt, 0) as completed_count,
        COALESCE(streak.longest_streak, 0) as longest_streak
    FROM pinned, badges, completed, streak;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_hero_dashboard(UUID) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_hero_dashboard(UUID) IS 
'Consolidated dashboard data for hero page. Returns pinned quests, badge IDs, completed count, and longest streak in a single query.';
