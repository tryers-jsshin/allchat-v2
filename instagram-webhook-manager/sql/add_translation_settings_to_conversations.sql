-- ================================================
-- 대화별 번역 설정 기능 추가
-- Date: 2025-01-29
-- Description: conversations 테이블에 번역 설정 컬럼 추가
-- ================================================

-- 1. 번역 설정 컬럼 추가
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS translation_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS translation_target_lang VARCHAR(10) DEFAULT NULL;

-- 2. 번역 설정 컬럼에 인덱스 추가 (활성화된 번역 대화 조회용)
CREATE INDEX IF NOT EXISTS idx_conversations_translation 
  ON conversations(translation_enabled, translation_target_lang)
  WHERE translation_enabled = true;

-- 3. 기본값 설정 (모든 기존 대화는 번역 비활성화)
UPDATE conversations 
SET translation_enabled = FALSE 
WHERE translation_enabled IS NULL;

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
WHERE table_name = 'conversations'
  AND column_name IN ('translation_enabled', 'translation_target_lang');

-- 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'conversations'
  AND indexname = 'idx_conversations_translation';

-- 번역 설정 상태 확인
SELECT 
  platform,
  COUNT(*) as total_conversations,
  COUNT(*) FILTER (WHERE translation_enabled = true) as translation_enabled_count,
  COUNT(DISTINCT translation_target_lang) as unique_languages
FROM conversations
GROUP BY platform;

-- ================================================
-- 지원 언어 코드 참고
-- ================================================
-- EN: 영어
-- JA: 일본어  
-- ZH: 중국어 (간체)
-- ZH-TW: 중국어 (번체)
-- ES: 스페인어
-- FR: 프랑스어
-- DE: 독일어
-- RU: 러시아어
-- PT: 포르투갈어
-- IT: 이탈리아어
-- NL: 네덜란드어
-- PL: 폴란드어
-- KO: 한국어 (원본이 한국어가 아닐 때)

-- ================================================
-- 롤백 스크립트 (필요시)
-- ================================================
/*
-- 인덱스 삭제
DROP INDEX IF EXISTS idx_conversations_translation;

-- 컬럼 삭제
ALTER TABLE conversations 
DROP COLUMN IF EXISTS translation_enabled,
DROP COLUMN IF EXISTS translation_target_lang;
*/

-- ================================================
-- 주의사항
-- ================================================
-- 1. translation_target_lang은 DeepL API가 지원하는 언어 코드 사용
-- 2. translation_enabled = true이지만 target_lang이 NULL인 경우 번역 안함
-- 3. 각 대화별로 독립적인 번역 설정 가능