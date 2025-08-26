-- Phase 1: Performance Optimization for Instagram Conversations
-- Execute this in Supabase SQL Editor

-- 1. Add message_count field to instagram_conversations
ALTER TABLE instagram_conversations 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- 2. Update existing conversations with message counts
UPDATE instagram_conversations c
SET message_count = (
  SELECT COUNT(*)
  FROM instagram_webhooks w
  WHERE (
    (w.sender_id = c.participant_1_id AND w.recipient_id = c.participant_2_id) OR
    (w.sender_id = c.participant_2_id AND w.recipient_id = c.participant_1_id)
  )
  AND w.webhook_type != 'read'
);

-- 3. Create function to increment message count
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id TEXT;
  v_participant_1 TEXT;
  v_participant_2 TEXT;
BEGIN
  -- Skip if it's a read event, echo, or deleted message
  IF NEW.webhook_type = 'read' OR NEW.is_echo = true OR NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;
  
  -- Skip if no sender/recipient
  IF NEW.sender_id IS NULL OR NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Generate conversation_id
  IF NEW.sender_id < NEW.recipient_id THEN
    v_participant_1 := NEW.sender_id;
    v_participant_2 := NEW.recipient_id;
  ELSE
    v_participant_1 := NEW.recipient_id;
    v_participant_2 := NEW.sender_id;
  END IF;
  v_conversation_id := v_participant_1 || '_' || v_participant_2;
  
  -- Increment message count
  UPDATE instagram_conversations 
  SET message_count = message_count + 1
  WHERE conversation_id = v_conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for message count
DROP TRIGGER IF EXISTS increment_conversation_message_count ON instagram_webhooks;
CREATE TRIGGER increment_conversation_message_count
AFTER INSERT ON instagram_webhooks
FOR EACH ROW
EXECUTE FUNCTION increment_message_count();

-- 5. Create optimized view for conversations with profiles
CREATE OR REPLACE VIEW instagram_conversations_with_profiles AS
SELECT 
  c.*,
  p.name as customer_name,
  p.username as customer_username,
  p.profile_pic as customer_profile_pic,
  p.is_verified_user as customer_is_verified,
  p.follower_count as customer_follower_count
FROM instagram_conversations c
LEFT JOIN instagram_user_profiles p ON c.customer_id = p.igsid
ORDER BY c.last_message_at DESC;

-- 6. Grant permissions
GRANT SELECT ON instagram_conversations_with_profiles TO anon, authenticated;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_last_message 
ON instagram_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_status 
ON instagram_conversations(status);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_customer 
ON instagram_conversations(customer_id);

CREATE INDEX IF NOT EXISTS idx_instagram_webhooks_participants 
ON instagram_webhooks(sender_id, recipient_id);

-- Success message
SELECT 'Phase 1 optimization completed successfully!' as status;