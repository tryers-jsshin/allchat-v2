-- Conversations 테이블 생성
-- Instagram 메시지 대화방 관리를 위한 테이블

-- 기존 테이블 삭제 (필요시)
-- DROP TABLE IF EXISTS conversations CASCADE;

-- Conversations 테이블 생성
CREATE TABLE IF NOT EXISTS conversations (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Conversation Identifier
    conversation_id TEXT NOT NULL UNIQUE, -- "작은ID_큰ID" 형식
    
    -- Participants
    participant_1_id TEXT NOT NULL,      -- 작은 ID (정렬된)
    participant_2_id TEXT NOT NULL,      -- 큰 ID (정렬된)
    business_account_id TEXT NOT NULL,   -- 비즈니스 계정 ID
    customer_id TEXT NOT NULL,           -- 고객 ID
    
    -- Status Management
    status TEXT NOT NULL DEFAULT 'new',  -- new, in_progress, waiting_customer, waiting_agent, resolved, closed, spam
    status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    assigned_to TEXT,                    -- 담당자 ID/이름 (선택)
    
    -- Last Message Info
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_text TEXT,              -- 마지막 메시지 미리보기
    last_message_type TEXT,              -- message, reaction, postback 등
    last_sender_id TEXT,                 -- 마지막 발신자 ID
    
    -- Conversation Metrics
    unread_count INTEGER DEFAULT 0,      -- 읽지 않은 메시지 수
    
    -- Additional Info
    notes TEXT,                          -- 상담 메모
    tags TEXT[],                         -- 태그 (예: ['중요', 'VIP', '불만'])
    priority INTEGER DEFAULT 0,          -- 우선순위 (0: 보통, 1: 높음, 2: 긴급)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_account ON conversations(business_account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON conversations(unread_count) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status_updated ON conversations(status_updated_at DESC);

-- 태그 검색을 위한 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON conversations USING GIN(tags);

-- updated_at 자동 업데이트 함수
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

-- updated_at 트리거
CREATE TRIGGER update_conversation_updated_at_trigger
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();

-- 웹훅 수신 시 대화 생성/업데이트 함수
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
    -- 일반적으로 recipient_id가 비즈니스 계정 (웹훅을 받는 쪽)
    -- 하지만 echo 메시지의 경우 sender_id가 비즈니스 계정
    -- 여기서는 단순화를 위해 recipient_id를 비즈니스로 가정
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

-- 웹훅 테이블에 트리거 연결
CREATE TRIGGER update_conversation_on_webhook
AFTER INSERT ON instagram_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_or_create_conversation();

-- 대화 상태 변경 이력 테이블 (선택적)
CREATE TABLE IF NOT EXISTS conversation_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_status_history_conversation ON conversation_status_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created ON conversation_status_history(created_at DESC);

-- 상태 변경 이력 기록 함수
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

-- 상태 변경 이력 트리거
CREATE TRIGGER log_status_change_trigger
AFTER UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION log_conversation_status_change();

-- 유용한 뷰: 활성 대화 목록
CREATE OR REPLACE VIEW active_conversations AS
SELECT 
    c.*,
    p.name as customer_name,
    p.username as customer_username,
    p.profile_pic as customer_profile_pic,
    p.is_verified_user as customer_verified,
    p.follower_count as customer_followers,
    (SELECT COUNT(*) FROM instagram_webhooks w 
     WHERE (w.sender_id = c.customer_id AND w.recipient_id = c.business_account_id)
        OR (w.sender_id = c.business_account_id AND w.recipient_id = c.customer_id)
    ) as total_messages
FROM conversations c
LEFT JOIN instagram_user_profiles p ON p.igsid = c.customer_id
WHERE c.status NOT IN ('closed', 'spam')
ORDER BY c.last_message_at DESC;

-- Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_status_history ENABLE ROW LEVEL SECURITY;

-- 개발 환경용 정책 (프로덕션에서는 수정 필요)
CREATE POLICY "Allow all operations on conversations" ON conversations
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on status history" ON conversation_status_history
    FOR ALL USING (true);

-- 권한 부여
GRANT ALL ON conversations TO anon, authenticated;
GRANT ALL ON conversation_status_history TO anon, authenticated;
GRANT ALL ON active_conversations TO anon, authenticated;

-- 성공 메시지
SELECT 'Conversations table created successfully!' as status;