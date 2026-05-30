-- Add category, kanban_status, and notes to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category      text,
  ADD COLUMN IF NOT EXISTS kanban_status text NOT NULL DEFAULT 'inbox',
  ADD COLUMN IF NOT EXISTS notes         text;

-- Seed kanban_status from existing urgency values
UPDATE public.tasks SET kanban_status = 'today'       WHERE urgency = 'today'     AND completed_at IS NULL;
UPDATE public.tasks SET kanban_status = 'in_progress' WHERE urgency = 'high'      AND completed_at IS NULL;
UPDATE public.tasks SET kanban_status = 'next'        WHERE urgency IN ('this_week','medium') AND completed_at IS NULL;
UPDATE public.tasks SET kanban_status = 'done'        WHERE completed_at IS NOT NULL;
