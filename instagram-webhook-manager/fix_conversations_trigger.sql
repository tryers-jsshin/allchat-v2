-- 기존 트리거와 함수 삭제 후 재생성

-- 1. 기존 트리거 삭제
DROP TRIGGER IF EXISTS update_conversation_updated_at_trigger ON conversations;
DROP TRIGGER IF EXISTS update_conversation_on_webhook ON instagram_webhooks;
DROP TRIGGER IF EXISTS log_status_change_trigger ON conversations;

-- 2. 기존 함수 삭제
DROP FUNCTION IF EXISTS update_conversation_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_or_create_conversation() CASCADE;
DROP FUNCTION IF EXISTS log_conversation_status_change() CASCADE;

-- 3. updated_at 자동 업데이트 함수 재생성
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    -- status 변경 시 status_updated_at도 업데이트
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = TIMEZONE('utc', NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. updated_at 트리거 재생성
CREATE TRIGGER update_conversation_updated_at_trigger
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();

-- 5. 웹훅 수신 시 대화 생성/업데이트 함수 재생성
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
    
    -- 비즈니스 계정과 고객 구분
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
    
    -- Conversation 생성 또는 업데이트
    INSERT INTO conversations (
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
        'new',
        1
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
        last_message_at = EXCLUDED.last_message_at,
        last_message_text = EXCLUDED.last_message_text,
        last_message_type = EXCLUDED.last_message_type,
        last_sender_id = EXCLUDED.last_sender_id,
        -- 새 메시지가 왔을 때 상태 업데이트 로직
        status = CASE 
            WHEN conversations.status = 'closed' THEN 'new'  -- 종료된 대화 재개
            WHEN conversations.status = 'resolved' THEN 'new'  -- 해결된 대화 재개
            WHEN conversations.status = 'spam' THEN conversations.status  -- 스팸은 유지
            ELSE conversations.status
        END,
        -- unread_count 증가 (실제로는 별도 로직 필요)
        unread_count = CASE 
            WHEN EXCLUDED.last_sender_id != conversations.business_account_id 
            THEN conversations.unread_count + 1
            ELSE conversations.unread_count
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 웹훅 테이블에 트리거 연결
CREATE TRIGGER update_conversation_on_webhook
AFTER INSERT ON instagram_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_or_create_conversation();

-- 7. 상태 변경 이력 기록 함수 재생성
CREATE OR REPLACE FUNCTION log_conversation_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO conversation_status_history (
            conversation_id,
            old_status,
            new_status,
            changed_by,
            reason
        ) VALUES (
            NEW.conversation_id,
            OLD.status,
            NEW.status,
            COALESCE(NEW.assigned_to, 'system'),
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 상태 변경 이력 트리거 재생성
CREATE TRIGGER log_status_change_trigger
AFTER UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION log_conversation_status_change();

-- 성공 메시지
SELECT 'Triggers fixed successfully!' as status;