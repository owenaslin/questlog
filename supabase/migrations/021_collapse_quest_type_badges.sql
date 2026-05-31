-- Collapse main/side quest types into a single quest type.
--
-- The badges that required completing a number of "main" or "side" quests are
-- no longer obtainable, because quest_type is now always written NULL. Repurpose
-- them as total-quest milestones (a requirement type the award function already
-- supports). Rows are updated by key so their id stays stable and previously
-- earned badges remain valid.

UPDATE public.badges
SET name = 'Quest Explorer',
    description = 'Complete 10 quests',
    icon = '🧭',
    requirement_type = 'total_quests',
    requirement_value = 10
WHERE key = 'side_quest_explorer';

UPDATE public.badges
SET name = 'Pathfinder',
    description = 'Complete 15 quests',
    icon = '🎖️',
    requirement_type = 'total_quests',
    requirement_value = 15
WHERE key = 'main_quest_hero';

UPDATE public.badges
SET name = 'Marathoner',
    description = 'Complete 75 quests',
    icon = '🏆',
    requirement_type = 'total_quests',
    requirement_value = 75
WHERE key = 'marathoner';

UPDATE public.badges
SET name = 'True Hero',
    description = 'Complete 150 quests',
    icon = '🦸',
    requirement_type = 'total_quests',
    requirement_value = 150
WHERE key = 'true_hero';
