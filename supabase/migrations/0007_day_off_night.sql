-- Add day_off_night shift type support
ALTER TABLE public.work_settings
  ADD COLUMN IF NOT EXISTS mult_day_off_night numeric(4,2) NOT NULL DEFAULT 2.50;
