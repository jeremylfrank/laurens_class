-- Delete results older than 13 months, every night at 3:17 am (UTC).
-- Needs the pg_cron extension: Supabase dashboard > Database > Extensions > pg_cron > enable.
create extension if not exists pg_cron;

select cron.schedule('purge-old-attempts', '17 3 * * *', $$select public.purge_old_attempts()$$);
