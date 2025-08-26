-- Phase 4: Performance Benchmark
-- Run this after phase4_performance_optimization.sql

-- ================================================
-- 1. BASELINE MEASUREMENTS
-- ================================================

-- Test 1: Original instagram_conversations query
EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
SELECT 
  ic.*,
  p.name, p.username, p.profile_pic
FROM instagram_conversations ic
LEFT JOIN instagram_user_profiles p ON ic.customer_id = p.igsid
WHERE ic.status IN ('pending', 'in_progress')
ORDER BY ic.last_message_at DESC
LIMIT 50;

-- Test 2: Optimized materialized view query
EXPLAIN (ANALYZE, BUFFERS, TIMING, VERBOSE)
SELECT * 
FROM conversations_with_profiles
WHERE platform = 'instagram'
  AND status IN ('pending', 'in_progress')
ORDER BY last_message_at DESC
LIMIT 50;

-- ================================================
-- 2. STATUS COUNT PERFORMANCE
-- ================================================

-- Test 3: Original count method
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as active,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) as total
FROM instagram_conversations;

-- Test 4: Optimized function
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM get_conversation_status_counts('instagram');

-- ================================================
-- 3. CONCURRENT LOAD TEST
-- ================================================

-- Simulate 10 concurrent queries
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  i integer;
BEGIN
  start_time := clock_timestamp();
  
  FOR i IN 1..10 LOOP
    PERFORM * FROM conversations_with_profiles 
    WHERE platform = 'instagram' 
    LIMIT 50;
  END LOOP;
  
  end_time := clock_timestamp();
  
  RAISE NOTICE 'Materialized View: 10 queries in %ms', 
    EXTRACT(MILLISECOND FROM (end_time - start_time));
END $$;

-- ================================================
-- 4. INDEX EFFECTIVENESS
-- ================================================

-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'RARELY USED'
    WHEN idx_scan < 1000 THEN 'MODERATELY USED'
    ELSE 'FREQUENTLY USED'
  END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'user_profiles', 'conversations_with_profiles')
ORDER BY idx_scan DESC;

-- ================================================
-- 5. CACHE HIT RATIO
-- ================================================

SELECT 
  datname,
  blks_hit::float / (blks_hit + blks_read) * 100 as cache_hit_ratio,
  blks_hit as cache_hits,
  blks_read as disk_reads
FROM pg_stat_database
WHERE datname = current_database();

-- ================================================
-- 6. TABLE SIZES AND BLOAT
-- ================================================

SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
  pg_size_pretty(pg_indexes_size(tablename::regclass)) as indexes_size,
  (pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass))::float 
    / pg_total_relation_size(tablename::regclass) * 100 as index_percentage
FROM (
  VALUES 
    ('conversations'),
    ('user_profiles'),
    ('instagram_conversations'),
    ('instagram_user_profiles'),
    ('conversations_with_profiles')
) AS t(tablename)
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- ================================================
-- 7. QUERY PERFORMANCE COMPARISON
-- ================================================

WITH performance_tests AS (
  SELECT 
    'Original View' as test_name,
    (SELECT COUNT(*) FROM instagram_conversations_with_profiles) as record_count,
    (
      SELECT EXTRACT(MILLISECOND FROM (clock_timestamp() - start_time))
      FROM (
        SELECT clock_timestamp() as start_time,
               (SELECT * FROM instagram_conversations_with_profiles LIMIT 50) as result
      ) t
    ) as execution_time_ms
  
  UNION ALL
  
  SELECT 
    'Materialized View' as test_name,
    (SELECT COUNT(*) FROM conversations_with_profiles WHERE platform = 'instagram') as record_count,
    (
      SELECT EXTRACT(MILLISECOND FROM (clock_timestamp() - start_time))
      FROM (
        SELECT clock_timestamp() as start_time,
               (SELECT * FROM conversations_with_profiles WHERE platform = 'instagram' LIMIT 50) as result
      ) t
    ) as execution_time_ms
)
SELECT 
  test_name,
  record_count,
  execution_time_ms,
  CASE 
    WHEN execution_time_ms < 50 THEN '🟢 EXCELLENT'
    WHEN execution_time_ms < 200 THEN '🟡 GOOD'
    WHEN execution_time_ms < 500 THEN '🟠 ACCEPTABLE'
    ELSE '🔴 SLOW'
  END as performance_grade
FROM performance_tests;

-- ================================================
-- 8. FINAL PERFORMANCE REPORT
-- ================================================

SELECT 
  'Phase 4 Performance Report' as title,
  NOW() as timestamp,
  jsonb_build_object(
    'materialized_view_exists', 
      EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'conversations_with_profiles'),
    'optimized_indexes_count', 
      (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'conversations'),
    'cache_hit_ratio', 
      (SELECT ROUND(blks_hit::float / (blks_hit + blks_read) * 100, 2) 
       FROM pg_stat_database WHERE datname = current_database()),
    'total_conversations', 
      (SELECT COUNT(*) FROM conversations),
    'mat_view_size',
      (SELECT pg_size_pretty(pg_total_relation_size('conversations_with_profiles'))),
    'optimization_status', 'COMPLETED'
  ) as metrics;