-- Migration Script: conversations → instagram_conversations
-- Execute this in Supabase SQL Editor

-- 1. Drop the view first
DROP VIEW IF EXISTS active_conversations CASCADE;

-- 2. Rename the table
ALTER TABLE conversations RENAME TO instagram_conversations;

-- 3. Add platform column to status history
ALTER TABLE conversation_status_history 
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'instagram';

-- 4. Update Foreign Key constraint
ALTER TABLE conversation_status_history 
DROP CONSTRAINT IF EXISTS conversation_status_history_conversation_id_fkey;

ALTER TABLE conversation_status_history 
ADD CONSTRAINT conversation_status_history_instagram_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES instagram_conversations(conversation_id);

-- 5. Update the trigger function to use new table name
CREATE OR REPLACE FUNCTION update_or_create_conversation()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation_id TEXT;
    v_participant_1 TEXT;
    v_participant_2 TEXT;
    v_business_id TEXT;
    v_customer_id TEXT;
    v_last_sender TEXT;
    v_message_type TEXT;
    v_message_text TEXT;
BEGIN
    -- echo 메시지나 삭제된 메시지는 무시
    IF NEW.is_echo = true OR NEW.is_deleted = true THEN
        RETURN NEW;
    END IF;
    
    -- sender_id와 recipient_id가 없으면 무시
    IF NEW.sender_id IS NULL OR NEW.recipient_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- conversation_id 생성 (작은 ID_큰 ID)
    IF NEW.sender_id < NEW.recipient_id THEN
        v_participant_1 := NEW.sender_id;
        v_participant_2 := NEW.recipient_id;
    ELSE
        v_participant_1 := NEW.recipient_id;
        v_participant_2 := NEW.sender_id;
    END IF;
    v_conversation_id := v_participant_1 || '_' || v_participant_2;
    
    v_business_id := NEW.recipient_id;
    v_customer_id := NEW.sender_id;
    v_last_sender := NEW.sender_id;
    
    -- 메시지 타입과 텍스트 설정
    v_message_type := NEW.webhook_type;
    v_message_text := COALESCE(
        NEW.message_text,
        CASE 
            WHEN NEW.webhook_type = 'reaction' THEN 
                CASE 
                    WHEN NEW.reaction_action = 'react' THEN '👍 ' || COALESCE(NEW.reaction_type, 'Reaction')
                    ELSE '👎 Reaction removed'
                END
            WHEN NEW.webhook_type = 'postback' THEN 'Button: ' || COALESCE(NEW.postback_title, 'Postback')
            WHEN NEW.webhook_type = 'read' THEN '✓✓ Message read'
            WHEN NEW.webhook_type = 'referral' THEN 'Referral from ' || COALESCE(NEW.referral_source, 'unknown')
            WHEN NEW.webhook_type = 'ephemeral' THEN '🕐 Ephemeral media'
            WHEN NEW.attachment_types IS NOT NULL AND array_length(NEW.attachment_types, 1) > 0 THEN
                CASE NEW.attachment_types[1]
                    WHEN 'image' THEN '🖼️ Image'
                    WHEN 'video' THEN '🎥 Video'
                    WHEN 'audio' THEN '🎵 Audio'
                    WHEN 'file' THEN '📎 File'
                    ELSE '📁 Attachment'
                END
            ELSE 'Message'
        END
    );
    
    -- instagram_conversations 테이블에 생성 또는 업데이트
    INSERT INTO instagram_conversations (
        conversation_id,
        participant_1_id,
        participant_2_id,
        business_account_id,
        customer_id,
        last_message_at,
        last_message_text,
        last_message_type,
        last_sender_id,
        status,
        unread_count
    ) VALUES (
        v_conversation_id,
        v_participant_1,
        v_participant_2,
        v_business_id,
        v_customer_id,
        COALESCE(NEW.created_at, NOW()),
        v_message_text,
        v_message_type,
        v_last_sender,
        'pending',  -- 새 상태 체계
        1
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
        last_message_at = EXCLUDED.last_message_at,
        last_message_text = EXCLUDED.last_message_text,
        last_message_type = EXCLUDED.last_message_type,
        last_sender_id = EXCLUDED.last_sender_id,
        -- 새 메시지가 왔을 때 상태 업데이트 로직
        status = CASE 
            WHEN instagram_conversations.status = 'completed' THEN 'pending'  -- 완료된 대화 재개
            ELSE instagram_conversations.status
        END,
        -- unread_count 증가
        unread_count = CASE 
            WHEN EXCLUDED.last_sender_id != instagram_conversations.business_account_id 
            THEN instagram_conversations.unread_count + 1
            ELSE instagram_conversations.unread_count
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Update status change logging function
CREATE OR REPLACE FUNCTION log_conversation_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO conversation_status_history (
            conversation_id,
            old_status,
            new_status,
            changed_by,
            reason,
            platform  -- 새 필드 추가
        ) VALUES (
            NEW.conversation_id,
            OLD.status,
            NEW.status,
            COALESCE(NEW.assigned_to, 'system'),
            NULL,
            'instagram'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Drop and recreate triggers with new table reference
DROP TRIGGER IF EXISTS update_conversation_on_webhook ON instagram_webhooks;
DROP TRIGGER IF EXISTS log_status_change_trigger ON conversations;
DROP TRIGGER IF EXISTS log_status_change_trigger ON instagram_conversations;

-- Create triggers for instagram_conversations
CREATE TRIGGER update_conversation_on_webhook
AFTER INSERT ON instagram_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_or_create_conversation();

CREATE TRIGGER log_status_change_trigger
AFTER UPDATE ON instagram_conversations
FOR EACH ROW
EXECUTE FUNCTION log_conversation_status_change();

-- 8. Update existing status values to new system
UPDATE instagram_conversations 
SET status = CASE 
    WHEN status IN ('new', 'waiting_agent') THEN 'pending'
    WHEN status IN ('in_progress', 'waiting_customer') THEN 'in_progress'
    WHEN status IN ('resolved', 'closed') THEN 'completed'
    ELSE status
END
WHERE status NOT IN ('pending', 'in_progress', 'completed');

-- 9. Grant permissions
GRANT ALL ON instagram_conversations TO anon, authenticated;

-- Success message
SELECT 'Migration completed successfully!' as status;