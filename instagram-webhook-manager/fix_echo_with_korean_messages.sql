-- Fix trigger to handle echo messages and Korean text for attachments
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
    -- 삭제된 메시지만 무시 (echo는 이제 처리함)
    IF NEW.is_deleted = true THEN
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
    
    -- Echo 메시지 처리 (비즈니스가 보낸 메시지)
    IF NEW.is_echo = true THEN
        -- Echo일 때는 sender가 비즈니스, recipient이 고객
        v_business_id := NEW.sender_id;
        v_customer_id := NEW.recipient_id;
        v_last_sender := NEW.sender_id;
    ELSE
        -- 일반 메시지일 때는 sender가 고객, recipient이 비즈니스
        v_business_id := NEW.recipient_id;
        v_customer_id := NEW.sender_id;
        v_last_sender := NEW.sender_id;
    END IF;
    
    -- conversation_id 생성 (작은 ID_큰 ID)
    IF v_business_id < v_customer_id THEN
        v_participant_1 := v_business_id;
        v_participant_2 := v_customer_id;
    ELSE
        v_participant_1 := v_customer_id;
        v_participant_2 := v_business_id;
    END IF;
    v_conversation_id := v_participant_1 || '_' || v_participant_2;
    
    -- 메시지 타입과 텍스트 설정 (한글 메시지로 변경)
    v_message_type := NEW.webhook_type;
    v_message_text := COALESCE(
        NEW.message_text,
        CASE 
            WHEN NEW.webhook_type = 'reaction' THEN 
                CASE 
                    WHEN NEW.reaction_action = 'react' THEN '👍 반응을 남겼습니다'
                    ELSE '👎 반응을 취소했습니다'
                END
            WHEN NEW.webhook_type = 'postback' THEN '버튼: ' || COALESCE(NEW.postback_title, '포스트백')
            WHEN NEW.webhook_type = 'referral' THEN COALESCE(NEW.referral_source, '알 수 없음') || '에서 추천'
            WHEN NEW.webhook_type = 'ephemeral' THEN '🕐 임시 미디어'
            WHEN NEW.attachment_types IS NOT NULL AND array_length(NEW.attachment_types, 1) > 0 THEN
                CASE NEW.attachment_types[1]
                    WHEN 'image' THEN '사진을 보냈습니다.'
                    WHEN 'video' THEN '동영상을 보냈습니다.'
                    WHEN 'audio' THEN '음성 메시지를 보냈습니다.'
                    WHEN 'file' THEN '파일을 보냈습니다.'
                    ELSE '첨부파일을 보냈습니다.'
                END
            ELSE '메시지'
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
        unread_count,
        message_count
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
        'pending',
        CASE WHEN NEW.is_echo = true THEN 0 ELSE 1 END,  -- Echo 메시지는 unread 증가 안함
        1
    )
    ON CONFLICT (conversation_id) DO UPDATE SET
        last_message_at = EXCLUDED.last_message_at,
        last_message_text = EXCLUDED.last_message_text,
        last_message_type = EXCLUDED.last_message_type,
        last_sender_id = EXCLUDED.last_sender_id,
        -- 새 메시지가 왔을 때 상태 업데이트 로직
        status = CASE 
            WHEN instagram_conversations.status = 'completed' THEN 'pending'
            WHEN instagram_conversations.status = 'spam' THEN instagram_conversations.status
            ELSE instagram_conversations.status
        END,
        -- unread_count: Echo 메시지(비즈니스가 보냄)는 증가시키지 않음
        unread_count = CASE 
            WHEN NEW.is_echo = true THEN instagram_conversations.unread_count  -- Echo는 유지
            WHEN EXCLUDED.last_sender_id != instagram_conversations.business_account_id 
            THEN instagram_conversations.unread_count + 1
            ELSE instagram_conversations.unread_count
        END,
        -- message_count는 항상 증가 (echo 포함)
        message_count = instagram_conversations.message_count + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 통합 테이블 sync 함수도 업데이트 (한글 메시지 지원)
CREATE OR REPLACE FUNCTION sync_instagram_to_unified_conversations()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_pic TEXT;
  v_customer_verified BOOLEAN;
BEGIN
  -- Get profile data if available
  SELECT 
    display_name, 
    profile_pic, 
    is_verified
  INTO 
    v_customer_name, 
    v_customer_pic, 
    v_customer_verified
  FROM user_profiles
  WHERE platform = 'instagram' 
    AND platform_user_id = NEW.customer_id
  LIMIT 1;

  INSERT INTO conversations (
    platform,
    platform_conversation_id,
    customer_id,
    business_account_id,
    status,
    last_message_at,
    last_message_text,
    last_message_type,
    last_sender_id,
    unread_count,
    message_count,
    customer_name,
    customer_profile_pic,
    customer_is_verified,
    platform_data,
    created_at,
    updated_at
  ) VALUES (
    'instagram',
    NEW.conversation_id,
    NEW.customer_id,
    NEW.business_account_id,
    NEW.status,
    NEW.last_message_at,
    NEW.last_message_text,
    NEW.last_message_type,
    NEW.last_sender_id,
    NEW.unread_count,
    NEW.message_count,
    v_customer_name,
    v_customer_pic,
    v_customer_verified,
    jsonb_build_object(
      'participant_1_id', NEW.participant_1_id,
      'participant_2_id', NEW.participant_2_id,
      'assigned_to', NEW.assigned_to,
      'notes', NEW.notes,
      'tags', NEW.tags,
      'priority', NEW.priority
    ),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (platform, platform_conversation_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    last_message_at = EXCLUDED.last_message_at,
    last_message_text = EXCLUDED.last_message_text,
    last_message_type = EXCLUDED.last_message_type,
    last_sender_id = EXCLUDED.last_sender_id,
    unread_count = EXCLUDED.unread_count,
    message_count = EXCLUDED.message_count,
    customer_name = COALESCE(EXCLUDED.customer_name, conversations.customer_name),
    customer_profile_pic = COALESCE(EXCLUDED.customer_profile_pic, conversations.customer_profile_pic),
    customer_is_verified = COALESCE(EXCLUDED.customer_is_verified, conversations.customer_is_verified),
    platform_data = EXCLUDED.platform_data,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 확인 메시지
SELECT 
    'Echo messages enabled with Korean attachment text!' as status,
    '이미지: 사진을 보냈습니다.' as image_text,
    '비디오: 동영상을 보냈습니다.' as video_text,
    '오디오: 음성 메시지를 보냈습니다.' as audio_text,
    '파일: 파일을 보냈습니다.' as file_text;