-- Phase 2: Unified Platform Tables
-- Execute this in Supabase SQL Editor

-- ================================================
-- 1. CREATE UNIFIED TABLES
-- ================================================

-- 1-1. Unified conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_conversation_id TEXT NOT NULL,
  
  -- Common fields
  customer_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_text TEXT,
  last_message_type TEXT,
  last_sender_id TEXT,
  unread_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  
  -- Platform-specific data (JSONB for flexibility)
  platform_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Unique constraint for platform + conversation_id
  UNIQUE(platform, platform_conversation_id)
);

-- 1-2. Unified user profiles table (cache)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  
  -- Common profile fields
  display_name TEXT,
  username TEXT,
  profile_pic TEXT,
  is_verified BOOLEAN DEFAULT false,
  
  -- Platform-specific data
  platform_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint
  UNIQUE(platform, platform_user_id)
);

-- ================================================
-- 2. CREATE INDEXES
-- ================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_platform 
ON conversations(platform);

CREATE INDEX IF NOT EXISTS idx_conversations_status 
ON conversations(status);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_lookup 
ON conversations(platform, platform_conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_customer 
ON conversations(platform, customer_id);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_lookup 
ON user_profiles(platform, platform_user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_platform 
ON user_profiles(platform);

-- ================================================
-- 3. SYNC FUNCTIONS
-- ================================================

-- 3-1. Function to sync Instagram conversations to unified table
CREATE OR REPLACE FUNCTION sync_instagram_to_unified_conversations()
RETURNS TRIGGER AS $$
BEGIN
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
    platform_data = EXCLUDED.platform_data,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3-2. Function to sync Instagram profiles to unified table
CREATE OR REPLACE FUNCTION sync_instagram_profile_to_unified()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (
    platform,
    platform_user_id,
    display_name,
    username,
    profile_pic,
    is_verified,
    platform_data,
    created_at,
    updated_at,
    last_synced_at
  ) VALUES (
    'instagram',
    NEW.igsid,
    COALESCE(NEW.name, NEW.username),
    NEW.username,
    NEW.profile_pic,
    NEW.is_verified_user,
    jsonb_build_object(
      'follower_count', NEW.follower_count,
      'is_user_follow_business', NEW.is_user_follow_business,
      'is_business_follow_user', NEW.is_business_follow_user,
      'has_user_consent', NEW.has_user_consent
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.last_fetched_at
  )
  ON CONFLICT (platform, platform_user_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    username = EXCLUDED.username,
    profile_pic = EXCLUDED.profile_pic,
    is_verified = EXCLUDED.is_verified,
    platform_data = EXCLUDED.platform_data,
    updated_at = NOW(),
    last_synced_at = EXCLUDED.last_synced_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. CREATE TRIGGERS
-- ================================================

-- 4-1. Trigger to sync Instagram conversations
DROP TRIGGER IF EXISTS sync_instagram_conversations_to_unified ON instagram_conversations;
CREATE TRIGGER sync_instagram_conversations_to_unified
AFTER INSERT OR UPDATE ON instagram_conversations
FOR EACH ROW
EXECUTE FUNCTION sync_instagram_to_unified_conversations();

-- 4-2. Trigger to sync Instagram profiles
DROP TRIGGER IF EXISTS sync_instagram_profiles_to_unified ON instagram_user_profiles;
CREATE TRIGGER sync_instagram_profiles_to_unified
AFTER INSERT OR UPDATE ON instagram_user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_instagram_profile_to_unified();

-- ================================================
-- 5. MIGRATE EXISTING DATA
-- ================================================

-- 5-1. Migrate existing Instagram conversations
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
  platform_data,
  created_at,
  updated_at
)
SELECT
  'instagram' as platform,
  conversation_id as platform_conversation_id,
  customer_id,
  business_account_id,
  status,
  last_message_at,
  last_message_text,
  last_message_type,
  last_sender_id,
  unread_count,
  message_count,
  jsonb_build_object(
    'participant_1_id', participant_1_id,
    'participant_2_id', participant_2_id,
    'assigned_to', assigned_to,
    'notes', notes,
    'tags', tags,
    'priority', priority
  ) as platform_data,
  created_at,
  updated_at
FROM instagram_conversations
ON CONFLICT (platform, platform_conversation_id) DO NOTHING;

-- 5-2. Migrate existing Instagram profiles
INSERT INTO user_profiles (
  platform,
  platform_user_id,
  display_name,
  username,
  profile_pic,
  is_verified,
  platform_data,
  created_at,
  updated_at,
  last_synced_at
)
SELECT
  'instagram' as platform,
  igsid as platform_user_id,
  COALESCE(name, username) as display_name,
  username,
  profile_pic,
  is_verified_user as is_verified,
  jsonb_build_object(
    'follower_count', follower_count,
    'is_user_follow_business', is_user_follow_business,
    'is_business_follow_user', is_business_follow_user,
    'has_user_consent', has_user_consent
  ) as platform_data,
  created_at,
  updated_at,
  last_fetched_at as last_synced_at
FROM instagram_user_profiles
ON CONFLICT (platform, platform_user_id) DO NOTHING;

-- ================================================
-- 6. GRANT PERMISSIONS
-- ================================================

GRANT ALL ON conversations TO anon, authenticated;
GRANT ALL ON user_profiles TO anon, authenticated;

-- ================================================
-- 7. CREATE VIEWS FOR CONVENIENCE
-- ================================================

-- View for conversations with profiles (unified)
CREATE OR REPLACE VIEW conversations_with_profiles AS
SELECT 
  c.*,
  u.display_name as customer_name,
  u.username as customer_username,
  u.profile_pic as customer_profile_pic,
  u.is_verified as customer_is_verified,
  u.platform_data as customer_platform_data
FROM conversations c
LEFT JOIN user_profiles u 
  ON c.platform = u.platform 
  AND c.customer_id = u.platform_user_id
ORDER BY c.last_message_at DESC;

GRANT SELECT ON conversations_with_profiles TO anon, authenticated;

-- ================================================
-- 8. VERIFICATION
-- ================================================

-- Check if tables were created successfully
SELECT 
  'Unified tables created successfully!' as status,
  (SELECT COUNT(*) FROM conversations WHERE platform = 'instagram') as instagram_conversations_count,
  (SELECT COUNT(*) FROM user_profiles WHERE platform = 'instagram') as instagram_profiles_count;