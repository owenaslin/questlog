-- Add 'weekly_x_days' recurrence type (keep 'interval' for backward compatibility)
ALTER TABLE public.habits
  DROP CONSTRAINT IF EXISTS habits_recurrence_type_check;

ALTER TABLE public.habits
  ADD CONSTRAINT habits_recurrence_type_check
  CHECK (recurrence_type IN ('daily', 'weekdays', 'interval', 'weekly', 'weekly_x_days'));
