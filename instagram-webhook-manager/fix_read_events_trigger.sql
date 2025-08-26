-- Fix trigger function to skip read events
-- Execute this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_or_create_instagram_conversation()
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
    
    -- read 이벤트는 대화 리스트를 업데이트하지 않음
    IF NEW.webhook_type = 'read' THEN
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
        'pending',  -- 새 상태 체계 (new 대신 pending)
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
            WHEN instagram_conversations.status = 'spam' THEN instagram_conversations.status  -- 스팸은 유지
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

-- 확인 메시지
SELECT 'Trigger function updated: read events will no longer update conversation list!' as status;