-- Fix: night_start was accidentally seeded as '18:00' during an early deploy.
-- Lithuanian law: night supplement applies 22:00–06:00, not from 18:00.
UPDATE public.work_settings
SET night_start = '22:00', updated_at = now()
WHERE night_start = '18:00';
