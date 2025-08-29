-- ================================================
-- Soft Delete 기능 추가 마이그레이션
-- Date: 2025-01-29
-- Description: translations 테이블에 soft delete 컬럼 추가
-- ================================================

-- 1. Soft delete 컬럼 추가
ALTER TABLE translations 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. is_deleted 컬럼에 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_translations_active 
  ON translations(message_id, target_lang, is_deleted)
  WHERE is_deleted = false;

-- 3. 기존 데이터는 모두 is_deleted = false로 설정 (이미 DEFAULT FALSE이지만 명시적으로)
UPDATE translations 
SET is_deleted = FALSE 
WHERE is_deleted IS NULL;

-- ================================================
-- 검증 쿼리
-- ================================================

-- 컬럼 추가 확인
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'translations'
  AND column_name IN ('is_deleted', 'deleted_at');

-- 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'translations'
  AND indexname = 'idx_translations_active';

-- 활성 번역 수 확인
SELECT 
  COUNT(*) as total_translations,
  COUNT(*) FILTER (WHERE is_deleted = false OR is_deleted IS NULL) as active_translations,
  COUNT(*) FILTER (WHERE is_deleted = true) as deleted_translations
FROM translations;

-- ================================================
-- 롤백 스크립트 (필요시)
-- ================================================
/*
-- 인덱스 삭제
DROP INDEX IF EXISTS idx_translations_active;

-- 컬럼 삭제
ALTER TABLE translations 
DROP COLUMN IF EXISTS is_deleted,
DROP COLUMN IF EXISTS deleted_at;
*/

-- ================================================
-- 주의사항
-- ================================================
-- 1. 이 마이그레이션은 기존 번역 데이터에 영향을 주지 않음
-- 2. 모든 기존 번역은 자동으로 active(is_deleted=false) 상태가 됨
-- 3. deleted_at은 삭제 시점 추적용 (복구 시 NULL로 리셋)