-- Cleanup: Remove Old Views and Unused Objects
-- Execute this in Supabase SQL Editor

-- ================================================
-- 1. REMOVE OLD INSTAGRAM-SPECIFIC VIEW
-- ================================================

-- Drop the old Instagram-specific view (replaced by unified view)
DROP VIEW IF EXISTS instagram_conversations_with_profiles CASCADE;

-- ================================================
-- 2. VERIFY CURRENT STRUCTURE
-- ================================================

-- Check remaining views
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- Check remaining tables
SELECT 
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%conversation%' OR tablename LIKE '%profile%'
ORDER BY tablename;

-- ================================================
-- 3. FINAL STATUS
-- ================================================

SELECT 
  'Cleanup completed!' as status,
  EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'instagram_conversations_with_profiles') as old_view_exists,
  EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'conversations_with_profiles') as unified_view_exists,
  jsonb_build_object(
    'tables', jsonb_build_object(
      'instagram_webhooks', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'instagram_webhooks'),
      'instagram_conversations', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'instagram_conversations'),
      'instagram_user_profiles', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'instagram_user_profiles'),
      'conversations', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'conversations'),
      'user_profiles', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles')
    ),
    'views', jsonb_build_object(
      'conversations_with_profiles', EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'conversations_with_profiles'),
      'instagram_conversations_with_profiles', EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'instagram_conversations_with_profiles')
    )
  ) as structure_status;