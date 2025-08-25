-- Instagram User Profiles Table
-- 사용자 프로필 정보를 캐싱하여 저장하는 테이블

-- Drop existing table if needed (BE CAREFUL - this will delete all data)
-- DROP TABLE IF EXISTS instagram_user_profiles CASCADE;

-- Create user profiles table
CREATE TABLE IF NOT EXISTS instagram_user_profiles (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Instagram User Identifier (Instagram-scoped ID)
    igsid TEXT NOT NULL UNIQUE,
    
    -- Profile Information
    name TEXT,                       -- 사용자 이름 (설정 안됨일 수 있음)
    username TEXT,                    -- Instagram 사용자명
    profile_pic TEXT,                 -- 프로필 사진 URL (며칠 후 만료됨)
    profile_pic_updated_at TIMESTAMP WITH TIME ZONE, -- 프로필 사진 업데이트 시간
    
    -- User Statistics
    follower_count INTEGER DEFAULT 0, -- 팔로워 수
    is_verified_user BOOLEAN DEFAULT FALSE, -- 인증된 계정 여부
    
    -- Relationship Status (비즈니스 계정과의 관계)
    is_user_follow_business BOOLEAN DEFAULT FALSE, -- 사용자가 비즈니스를 팔로우하는지
    is_business_follow_user BOOLEAN DEFAULT FALSE, -- 비즈니스가 사용자를 팔로우하는지
    
    -- Consent Status
    has_user_consent BOOLEAN DEFAULT TRUE, -- 사용자 동의 여부 (프로필 접근 가능 여부)
    consent_granted_at TIMESTAMP WITH TIME ZONE, -- 동의 획득 시간 (첫 메시지 시간)
    
    -- Metadata
    raw_profile_data JSONB,          -- Instagram API에서 받은 원본 데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_fetched_at TIMESTAMP WITH TIME ZONE, -- 마지막으로 Instagram API에서 가져온 시간
    fetch_error TEXT,                 -- 마지막 fetch 시 발생한 에러 (있을 경우)
    
    -- Cache Management
    cache_expires_at TIMESTAMP WITH TIME ZONE, -- 캐시 만료 시간 (기본 24시간)
    fetch_count INTEGER DEFAULT 0,    -- API 호출 횟수 (rate limiting 관리용)
    
    -- Additional Business Context
    first_message_at TIMESTAMP WITH TIME ZONE, -- 첫 메시지 시간
    last_message_at TIMESTAMP WITH TIME ZONE,  -- 마지막 메시지 시간
    total_messages INTEGER DEFAULT 0,  -- 총 메시지 수
    is_active BOOLEAN DEFAULT TRUE,    -- 활성 사용자 여부
    notes TEXT                         -- 관리자 메모
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_igsid ON instagram_user_profiles(igsid);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON instagram_user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_cache_expires ON instagram_user_profiles(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_verified ON instagram_user_profiles(is_verified_user);
CREATE INDEX IF NOT EXISTS idx_user_profiles_follower_count ON instagram_user_profiles(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_message ON instagram_user_profiles(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON instagram_user_profiles(is_active);

-- Add foreign key relationship to webhooks table (optional)
-- This creates a link between webhooks and user profiles
ALTER TABLE instagram_webhooks 
ADD COLUMN IF NOT EXISTS sender_profile_id UUID REFERENCES instagram_user_profiles(id);

CREATE INDEX IF NOT EXISTS idx_webhooks_sender_profile ON instagram_webhooks(sender_profile_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_profile_updated_at_trigger
BEFORE UPDATE ON instagram_user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profile_updated_at();

-- Create a view for active users with recent messages
CREATE OR REPLACE VIEW active_instagram_users AS
SELECT 
    p.*,
    COUNT(DISTINCT w.id) as webhook_count,
    MAX(w.created_at) as last_webhook_at
FROM instagram_user_profiles p
LEFT JOIN instagram_webhooks w ON w.sender_id = p.igsid
WHERE p.is_active = TRUE
GROUP BY p.id;

-- Enable Row Level Security (RLS) - Modify based on your needs
ALTER TABLE instagram_user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication strategy)
-- For now, allowing all operations for development
CREATE POLICY "Allow all operations on user profiles" ON instagram_user_profiles
    FOR ALL USING (true);

-- Sample function to check if profile needs refresh
CREATE OR REPLACE FUNCTION profile_needs_refresh(profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT cache_expires_at, profile_pic_updated_at
    INTO profile_record
    FROM instagram_user_profiles
    WHERE id = profile_id;
    
    -- Check if cache expired (24 hours by default)
    IF profile_record.cache_expires_at IS NULL OR 
       profile_record.cache_expires_at < NOW() THEN
        RETURN TRUE;
    END IF;
    
    -- Check if profile pic is older than 3 days
    IF profile_record.profile_pic_updated_at IS NULL OR
       profile_record.profile_pic_updated_at < NOW() - INTERVAL '3 days' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Sample function to get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_igsid TEXT)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- Try to get existing profile
    SELECT id INTO profile_id
    FROM instagram_user_profiles
    WHERE igsid = user_igsid;
    
    -- If not found, create new profile
    IF profile_id IS NULL THEN
        INSERT INTO instagram_user_profiles (igsid)
        VALUES (user_igsid)
        RETURNING id INTO profile_id;
    END IF;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON instagram_user_profiles TO anon, authenticated;
GRANT ALL ON active_instagram_users TO anon, authenticated;

-- Success message
SELECT 'Instagram user profiles table created successfully!' as status;