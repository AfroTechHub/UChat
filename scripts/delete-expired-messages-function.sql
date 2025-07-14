-- Function to delete expired ephemeral messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < NOW();
  RETURN NULL; -- Result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that calls the function after any message insert or update
-- This ensures that expired messages are cleaned up periodically or upon new activity
CREATE TRIGGER delete_expired_messages_trigger
AFTER INSERT OR UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION delete_expired_messages();

-- Alternatively, or in addition, you can schedule this function to run periodically
-- using a database job scheduler (e.g., pg_cron for PostgreSQL)
