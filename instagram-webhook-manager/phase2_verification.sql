-- Phase 2: Verification Queries
-- Run these after executing phase2_unified_tables.sql

-- ================================================
-- 1. CHECK TABLES STRUCTURE
-- ================================================

-- Check conversations table
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- Check user_profiles table
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ================================================
-- 2. VERIFY DATA MIGRATION
-- ================================================

-- Compare counts
SELECT 
  'Instagram Conversations' as type,
  (SELECT COUNT(*) FROM instagram_conversations) as original_count,
  (SELECT COUNT(*) FROM conversations WHERE platform = 'instagram') as unified_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM instagram_conversations) = 
         (SELECT COUNT(*) FROM conversations WHERE platform = 'instagram')
    THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
UNION ALL
SELECT 
  'Instagram Profiles' as type,
  (SELECT COUNT(*) FROM instagram_user_profiles) as original_count,
  (SELECT COUNT(*) FROM user_profiles WHERE platform = 'instagram') as unified_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM instagram_user_profiles) = 
         (SELECT COUNT(*) FROM user_profiles WHERE platform = 'instagram')
    THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status;

-- ================================================
-- 3. TEST TRIGGER SYNCHRONIZATION
-- ================================================

-- Test conversation sync
-- Update a random Instagram conversation and check if it syncs
UPDATE instagram_conversations 
SET updated_at = NOW()
WHERE conversation_id = (
  SELECT conversation_id 
  FROM instagram_conversations 
  LIMIT 1
);

-- Check if the update was synced
SELECT 
  ic.conversation_id,
  ic.updated_at as instagram_updated_at,
  c.updated_at as unified_updated_at,
  CASE 
    WHEN ic.updated_at = c.updated_at 
    THEN '✅ Synced'
    ELSE '❌ Not synced'
  END as sync_status
FROM instagram_conversations ic
LEFT JOIN conversations c 
  ON c.platform = 'instagram' 
  AND c.platform_conversation_id = ic.conversation_id
WHERE ic.updated_at > NOW() - INTERVAL '1 minute';

-- ================================================
-- 4. CHECK INDEXES
-- ================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('conversations', 'user_profiles')
ORDER BY tablename, indexname;

-- ================================================
-- 5. SAMPLE DATA VERIFICATION
-- ================================================

-- Sample unified conversations with profiles
SELECT 
  c.platform,
  c.platform_conversation_id,
  c.customer_id,
  c.status,
  c.last_message_text,
  c.last_message_at,
  u.display_name,
  u.username,
  u.is_verified
FROM conversations c
LEFT JOIN user_profiles u 
  ON c.platform = u.platform 
  AND c.customer_id = u.platform_user_id
WHERE c.platform = 'instagram'
ORDER BY c.last_message_at DESC
LIMIT 5;

-- ================================================
-- 6. PERFORMANCE CHECK
-- ================================================

-- Compare query performance
EXPLAIN ANALYZE
SELECT * FROM conversations_with_profiles
WHERE platform = 'instagram'
LIMIT 50;

-- ================================================
-- 7. FINAL STATUS REPORT
-- ================================================

SELECT 
  'Phase 2 Verification Report' as title,
  NOW() as executed_at,
  jsonb_build_object(
    'conversations_table', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations'),
    'user_profiles_table', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles'),
    'conversations_count', (SELECT COUNT(*) FROM conversations),
    'profiles_count', (SELECT COUNT(*) FROM user_profiles),
    'instagram_conversations', (SELECT COUNT(*) FROM conversations WHERE platform = 'instagram'),
    'instagram_profiles', (SELECT COUNT(*) FROM user_profiles WHERE platform = 'instagram'),
    'triggers_active', EXISTS(
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name IN ('sync_instagram_conversations_to_unified', 'sync_instagram_profiles_to_unified')
    )
  ) as status;