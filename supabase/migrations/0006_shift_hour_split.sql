-- Add regular_hours and night_hours columns to track the split
ALTER TABLE public.work_shifts
  ADD COLUMN IF NOT EXISTS regular_hours numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_hours   numeric(5,2) NOT NULL DEFAULT 0;
