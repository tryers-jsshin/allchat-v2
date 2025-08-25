-- Echo 메시지도 대화 리스트에 반영되도록 트리거 수정

-- 1. 기존 트리거 삭제
DROP TRIGGER IF EXISTS update_conversation_on_webhook ON instagram_webhooks;

-- 2. 기존 함수 삭제
DROP FUNCTION IF EXISTS update_or_create_conversation() CASCADE;

-- 3. 수정된 함수 생성 - echo 메시지도 처리
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
    -- 삭제된 메시지나 read 타입은 무시
    IF NEW.is_deleted = true OR NEW.webhook_type = 'read' THEN
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
    
    -- echo 메시지 처리를 위한 로직 개선
    IF NEW.is_echo = true THEN
        -- echo 메시지인 경우 sender와 recipient이 반대
        v_business_id := NEW.sender_id;
        v_customer_id := NEW.recipient_id;
        v_last_sender := NEW.sender_id;
    ELSE
        -- 일반 메시지
        v_business_id := NEW.recipient_id;
        v_customer_id := NEW.sender_id;
        v_last_sender := NEW.sender_id;
    END IF;
    
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
        CASE WHEN NEW.is_echo = true THEN 0 ELSE 1 END
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
        -- unread_count 업데이트 (echo 메시지는 unread를 증가시키지 않음)
        unread_count = CASE 
            WHEN NEW.is_echo = true THEN conversations.unread_count  -- echo 메시지는 unread 유지
            WHEN EXCLUDED.last_sender_id != conversations.business_account_id 
            THEN conversations.unread_count + 1
            ELSE conversations.unread_count
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 웹훅 테이블에 트리거 연결
CREATE TRIGGER update_conversation_on_webhook
AFTER INSERT ON instagram_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_or_create_conversation();

-- 성공 메시지
SELECT 'Echo messages will now update conversation list!' as status;