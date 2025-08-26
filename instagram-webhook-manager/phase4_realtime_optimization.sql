-- Phase 4: Real-time Optimization (Removing Materialized View)
-- Execute this in Supabase SQL Editor

-- ================================================
-- 1. REMOVE MATERIALIZED VIEW
-- ================================================

-- Drop the materialized view and related functions
DROP MATERIALIZED VIEW IF EXISTS conversations_with_profiles CASCADE;
DROP FUNCTION IF EXISTS refresh_conversations_view() CASCADE;
DROP FUNCTION IF EXISTS admin_refresh_all_views() CASCADE;

-- ================================================
-- 2. ADD CACHE COLUMNS TO CONVERSATIONS TABLE
-- ================================================

-- Add frequently used profile fields to conversations table for caching
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_profile_pic TEXT,
ADD COLUMN IF NOT EXISTS customer_is_verified BOOLEAN DEFAULT false;

-- ================================================
-- 3. CREATE REGULAR VIEW (OPTIMIZED)
-- ================================================

-- Create regular view with cached fields (much faster than JOIN)
CREATE OR REPLACE VIEW conversations_with_profiles AS
SELECT 
  c.id,
  c.platform,
  c.platform_conversation_id,
  c.customer_id,
  c.business_account_id,
  c.status,
  c.last_message_at,
  c.last_message_text,
  c.last_message_type,
  c.last_sender_id,
  c.unread_count,
  c.message_count,
  c.platform_data,
  c.created_at,
  c.updated_at,
  -- Use cached fields first, fallback to JOIN if null
  COALESCE(c.customer_name, u.display_name) as customer_name,
  u.username as customer_username,
  COALESCE(c.customer_profile_pic, u.profile_pic) as customer_profile_pic,
  COALESCE(c.customer_is_verified, u.is_verified) as customer_is_verified,
  u.platform_data as customer_platform_data
FROM conversations c
LEFT JOIN user_profiles u 
  ON c.platform = u.platform 
  AND c.customer_id = u.platform_user_id
ORDER BY c.last_message_at DESC;

-- ================================================
-- 4. UPDATE SYNC FUNCTION TO CACHE PROFILE DATA
-- ================================================

-- Enhanced sync function that caches profile data
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

-- ================================================
-- 5. UPDATE PROFILE SYNC TO UPDATE CONVERSATIONS
-- ================================================

-- When profile updates, update cached fields in conversations
CREATE OR REPLACE FUNCTION sync_profile_cache_to_conversations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cached profile fields in conversations table
  UPDATE conversations
  SET 
    customer_name = NEW.display_name,
    customer_profile_pic = NEW.profile_pic,
    customer_is_verified = NEW.is_verified,
    updated_at = NOW()
  WHERE platform = NEW.platform 
    AND customer_id = NEW.platform_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile cache sync
DROP TRIGGER IF EXISTS sync_profile_cache ON user_profiles;
CREATE TRIGGER sync_profile_cache
AFTER INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_cache_to_conversations();

-- ================================================
-- 6. UPDATE EXISTING DATA WITH CACHED VALUES
-- ================================================

-- Backfill cached profile data for existing conversations
UPDATE conversations c
SET 
  customer_name = u.display_name,
  customer_profile_pic = u.profile_pic,
  customer_is_verified = u.is_verified
FROM user_profiles u
WHERE c.platform = u.platform 
  AND c.customer_id = u.platform_user_id
  AND c.customer_name IS NULL;

-- ================================================
-- 7. OPTIMIZED INDEXES (KEEP EXISTING)
-- ================================================

-- These indexes are still valuable
-- idx_conv_platform_status_time
-- idx_conv_active
-- idx_conv_customer_lookup
-- idx_profiles_platform_user

-- Add index for cached fields
CREATE INDEX IF NOT EXISTS idx_conv_customer_cache 
ON conversations(platform, customer_name, customer_profile_pic)
WHERE customer_name IS NOT NULL;

-- ================================================
-- 8. GRANT PERMISSIONS
-- ================================================

GRANT SELECT ON conversations_with_profiles TO anon, authenticated;

-- ================================================
-- 9. PERFORMANCE TEST QUERY
-- ================================================

-- Test the optimized view performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM conversations_with_profiles
WHERE platform = 'instagram'
  AND status IN ('pending', 'in_progress')
LIMIT 50;

-- ================================================
-- 10. VERIFICATION
-- ================================================

SELECT 
  'Real-time optimization completed!' as status,
  EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'conversations_with_profiles') as view_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'customer_name') as cache_columns_added,
  (SELECT COUNT(*) FROM conversations WHERE customer_name IS NOT NULL) as cached_profiles_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'conversations') as total_indexes;