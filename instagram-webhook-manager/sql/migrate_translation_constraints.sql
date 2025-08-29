-- ================================================
-- 번역 테이블 제약조건 마이그레이션
-- Date: 2025-01-29
-- Description: original_text 기반 제약조건을 message_id 기반으로 변경
-- ================================================

-- 1. 기존 unique constraint 삭제
ALTER TABLE translations 
DROP CONSTRAINT IF EXISTS unique_translation_cache;

-- 2. 새로운 unique constraint 추가 (message_id 기반)
-- 동일한 메시지에 대해 같은 타겟 언어와 제공자의 번역은 하나만 허용
ALTER TABLE translations 
ADD CONSTRAINT unique_translation_per_message 
  UNIQUE(message_id, target_lang, translation_provider);

-- 3. 불필요한 인덱스 삭제 (original_text 기반 캐시 인덱스)
DROP INDEX IF EXISTS idx_translations_cache;

-- 4. message_id와 target_lang 조합으로 새로운 인덱스 생성 (캐시 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_translations_message_cache 
  ON translations(message_id, target_lang, translation_provider)
  WHERE message_id IS NOT NULL;

-- ================================================
-- 검증 쿼리
-- ================================================

-- 제약조건 확인
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'translations'
  AND con.contype = 'u';  -- unique constraints

-- 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'translations'
ORDER BY indexname;

-- ================================================
-- 롤백 스크립트 (필요시)
-- ================================================
/*
-- 원래 상태로 되돌리기
ALTER TABLE translations 
DROP CONSTRAINT IF EXISTS unique_translation_per_message;

ALTER TABLE translations 
ADD CONSTRAINT unique_translation_cache 
  UNIQUE(original_text, target_lang, translation_provider);

DROP INDEX IF EXISTS idx_translations_message_cache;

CREATE INDEX IF NOT EXISTS idx_translations_cache 
  ON translations(original_text, target_lang, translation_provider);
*/

-- ================================================
-- 주의사항
-- ================================================
-- 1. 이 마이그레이션 실행 전 데이터 백업 권장
-- 2. 기존 데이터에 message_id가 없는 레코드가 있을 수 있음
-- 3. message_id가 NULL인 레코드는 제약조건의 영향을 받지 않음