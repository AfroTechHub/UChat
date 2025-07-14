-- This script assumes you have pg_cron extension installed and configured in your Supabase project.
-- If not, you'll need to enable it first via Supabase Dashboard -> Database -> Extensions.

-- Schedule the delete_expired_messages function to run every hour
SELECT cron.schedule(
  'delete-expired-messages-hourly', -- A unique name for your job
  '0 * * * *',                     -- Cron expression for every hour (at minute 0)
  'SELECT delete_expired_messages();' -- The SQL function to execute
);

-- You can view scheduled jobs with:
-- SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('delete-expired-messages-hourly');
