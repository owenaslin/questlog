-- Add times_per_week recurrence type to habits
-- This allows users to set habits like "go to the gym 3 times a week"

-- First, drop the existing constraint
ALTER TABLE public.habits DROP CONSTRAINT IF EXISTS habits_recurrence_type_check;

-- Recreate with times_per_week included
ALTER TABLE public.habits ADD CONSTRAINT habits_recurrence_type_check
  CHECK (recurrence_type IN ('daily', 'weekdays', 'interval', 'weekly', 'times_per_week'));
