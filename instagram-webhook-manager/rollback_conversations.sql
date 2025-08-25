-- Rollback script for conversations feature
-- Execute this in Supabase SQL Editor to remove all conversation-related database objects

-- 1. Drop the trigger first
DROP TRIGGER IF EXISTS update_conversation_trigger ON instagram_webhooks;

-- 2. Drop functions
DROP FUNCTION IF EXISTS update_conversation_on_webhook();
DROP FUNCTION IF EXISTS get_conversation_by_participant(TEXT);

-- 3. Drop policies
DROP POLICY IF EXISTS "Allow anonymous read conversations" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous insert conversations" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous update conversations" ON conversations;

-- 4. Drop view
DROP VIEW IF EXISTS conversation_summary;

-- 5. Drop indexes on instagram_webhooks
DROP INDEX IF EXISTS idx_webhooks_conversation_id;

-- 6. Remove conversation_id column from instagram_webhooks table
ALTER TABLE instagram_webhooks 
DROP COLUMN IF EXISTS conversation_id;

-- 7. Drop indexes on conversations table
DROP INDEX IF EXISTS idx_conversations_conversation_id;
DROP INDEX IF EXISTS idx_conversations_participant_ids;
DROP INDEX IF EXISTS idx_conversations_last_message_time;
DROP INDEX IF EXISTS idx_conversations_is_active;

-- 8. Finally, drop the conversations table
DROP TABLE IF EXISTS conversations;

-- Verify cleanup
SELECT 'Rollback completed successfully!' as status;