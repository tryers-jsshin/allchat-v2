-- Phase 4: Performance Optimization
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
ON user_profiles(platform, platform_user_id)
INCLUDE (display_name, username, profile_pic, is_verified);

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
-- 4. REFRESH FUNCTION AND TRIGGER
-- ================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_conversations_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversations_with_profiles;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger refresh after changes
CREATE OR REPLACE FUNCTION trigger_refresh_conversations_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Debounce: Only refresh if last refresh was more than 5 seconds ago
  IF (
    SELECT COALESCE(
      EXTRACT(EPOCH FROM (NOW() - pg_stat_user_tables.last_vacuum))::integer,
      10
    ) >= 5
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' 
    AND tablename = 'conversations_with_profiles'
    LIMIT 1
  ) THEN
    PERFORM refresh_conversations_view();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-refresh (with debouncing)
CREATE OR REPLACE FUNCTION schedule_mat_view_refresh()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule refresh in 2 seconds (batch multiple changes)
  PERFORM pg_notify('refresh_mat_view', 'conversations_with_profiles');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_mat_view_on_conv_change ON conversations;
CREATE TRIGGER refresh_mat_view_on_conv_change
AFTER INSERT OR UPDATE OR DELETE ON conversations
FOR EACH STATEMENT
EXECUTE FUNCTION schedule_mat_view_refresh();

DROP TRIGGER IF EXISTS refresh_mat_view_on_profile_change ON user_profiles;
CREATE TRIGGER refresh_mat_view_on_profile_change
AFTER INSERT OR UPDATE OR DELETE ON user_profiles
FOR EACH STATEMENT
EXECUTE FUNCTION schedule_mat_view_refresh();

-- ================================================
-- 5. OPTIMIZE EXISTING TABLES
-- ================================================

-- Update table statistics
ANALYZE conversations;
ANALYZE user_profiles;
ANALYZE instagram_conversations;
ANALYZE instagram_user_profiles;

-- Set appropriate fill factors for frequently updated tables
ALTER TABLE conversations SET (fillfactor = 90);
ALTER TABLE user_profiles SET (fillfactor = 90);

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
-- 7. PERFORMANCE MONITORING VIEWS
-- ================================================

-- View to monitor slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  min_time
FROM pg_stat_statements
WHERE query LIKE '%conversations%'
ORDER BY mean_time DESC
LIMIT 20;

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'user_profiles', 'conversations_with_profiles')
ORDER BY idx_scan DESC;

-- ================================================
-- 8. GRANT PERMISSIONS
-- ================================================

GRANT SELECT ON conversations_with_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_status_counts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_conversations_view TO anon, authenticated;

-- ================================================
-- 9. INITIAL REFRESH
-- ================================================

-- Refresh materialized view with initial data
REFRESH MATERIALIZED VIEW conversations_with_profiles;

-- ================================================
-- 10. VERIFICATION
-- ================================================

-- Performance comparison
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM conversations_with_profiles
WHERE platform = 'instagram'
  AND status IN ('pending', 'in_progress')
ORDER BY last_message_at DESC
LIMIT 50;

-- Status count performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM get_conversation_status_counts('instagram');

-- Index usage verification
SELECT 
  'Performance optimization completed!' as status,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'conversations') as conversation_indexes,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'conversations_with_profiles') as mat_view_indexes,
  (SELECT pg_size_pretty(pg_total_relation_size('conversations_with_profiles'))) as mat_view_size;