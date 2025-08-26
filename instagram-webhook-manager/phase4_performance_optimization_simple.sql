-- Phase 4: Performance Optimization (Simplified Version)
-- Execute this in Supabase SQL Editor

-- ================================================
-- 1. DROP EXISTING INDEXES (CLEANUP)
-- ================================================

-- Drop redundant indexes if they exist
DROP INDEX IF EXISTS idx_conversations_platform;
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_last_message;

-- ================================================
-- 2. CREATE OPTIMIZED COMPOSITE INDEXES
-- ================================================

-- 2-1. Main query optimization (platform + status + last_message_at)
CREATE INDEX IF NOT EXISTS idx_conv_platform_status_time 
ON conversations(platform, status, last_message_at DESC)
WHERE last_message_at IS NOT NULL;

-- 2-2. Active conversations optimization
CREATE INDEX IF NOT EXISTS idx_conv_active 
ON conversations(platform, last_message_at DESC)
WHERE status IN ('pending', 'in_progress');

-- 2-3. Customer lookup optimization
CREATE INDEX IF NOT EXISTS idx_conv_customer_lookup 
ON conversations(platform, customer_id, last_message_at DESC);

-- 2-4. User profiles optimization
CREATE INDEX IF NOT EXISTS idx_profiles_platform_user 
ON user_profiles(platform, platform_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_display 
ON user_profiles(display_name, username);

-- 2-5. Message count queries
CREATE INDEX IF NOT EXISTS idx_conv_message_count 
ON conversations(platform, message_count DESC)
WHERE message_count > 0;

-- ================================================
-- 3. CREATE MATERIALIZED VIEW
-- ================================================

-- Drop existing view
DROP VIEW IF EXISTS conversations_with_profiles CASCADE;

-- Create materialized view for better performance
CREATE MATERIALIZED VIEW conversations_with_profiles AS
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
  -- User profile fields
  u.display_name as customer_name,
  u.username as customer_username,
  u.profile_pic as customer_profile_pic,
  u.is_verified as customer_is_verified,
  u.platform_data as customer_platform_data
FROM conversations c
LEFT JOIN user_profiles u 
  ON c.platform = u.platform 
  AND c.customer_id = u.platform_user_id
WITH DATA;

-- Create unique index for refresh concurrently
CREATE UNIQUE INDEX idx_mat_view_unique 
ON conversations_with_profiles(id);

-- Create indexes on materialized view
CREATE INDEX idx_mat_view_platform_status 
ON conversations_with_profiles(platform, status, last_message_at DESC);

CREATE INDEX idx_mat_view_active 
ON conversations_with_profiles(platform, last_message_at DESC)
WHERE status IN ('pending', 'in_progress');

-- ================================================
-- 4. REFRESH FUNCTION
-- ================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_conversations_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversations_with_profiles;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. OPTIMIZE EXISTING TABLES
-- ================================================

-- Update table statistics
ANALYZE conversations;
ANALYZE user_profiles;
ANALYZE instagram_conversations;
ANALYZE instagram_user_profiles;
ANALYZE conversations_with_profiles;

-- ================================================
-- 6. CREATE OPTIMIZED STATUS COUNT FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION get_conversation_status_counts(
  p_platform TEXT DEFAULT 'instagram'
)
RETURNS TABLE (
  active_count BIGINT,
  pending_count BIGINT,
  in_progress_count BIGINT,
  completed_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as active_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) as total_count
  FROM conversations
  WHERE platform = p_platform;
END;
$$ LANGUAGE plpgsql
STABLE
PARALLEL SAFE;

-- ================================================
-- 7. GRANT PERMISSIONS
-- ================================================

GRANT SELECT ON conversations_with_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_status_counts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_conversations_view TO anon, authenticated;

-- ================================================
-- 8. INITIAL REFRESH
-- ================================================

-- Refresh materialized view with initial data
REFRESH MATERIALIZED VIEW conversations_with_profiles;

-- ================================================
-- 9. MANUAL REFRESH FUNCTION (FOR ADMIN USE)
-- ================================================

-- Function to manually refresh materialized view (call this periodically or after bulk updates)
CREATE OR REPLACE FUNCTION admin_refresh_all_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversations_with_profiles;
  RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION admin_refresh_all_views TO authenticated;

-- ================================================
-- 10. VERIFICATION
-- ================================================

-- Simple verification
DO $$
BEGIN
  RAISE NOTICE '=== Phase 4 Performance Optimization Results ===';
  RAISE NOTICE 'Materialized View Created: %', 
    EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'conversations_with_profiles');
  RAISE NOTICE 'Status Count Function Created: %', 
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_conversation_status_counts');
  RAISE NOTICE 'Conversations Table Indexes: %', 
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'conversations');
  RAISE NOTICE 'User Profiles Table Indexes: %', 
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'user_profiles');
  RAISE NOTICE 'Materialized View Indexes: %', 
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'conversations_with_profiles');
  RAISE NOTICE '===========================================';
END $$;

-- Final status
SELECT 
  'Performance optimization completed successfully!' as status,
  (SELECT COUNT(*) FROM conversations_with_profiles) as mat_view_records,
  pg_size_pretty(pg_total_relation_size('conversations_with_profiles')) as mat_view_size;