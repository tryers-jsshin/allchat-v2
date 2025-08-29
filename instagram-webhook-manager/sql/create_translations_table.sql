-- ================================================
-- 번역 기능을 위한 데이터베이스 테이블 생성
-- Created: 2025-01-29
-- Description: DeepL API를 사용한 메시지 번역 저장 및 캐싱
-- ================================================

-- ================================================
-- 1. TRANSLATIONS 테이블 생성
-- ================================================
-- 메시지 번역을 저장하고 캐싱하는 메인 테이블
CREATE TABLE IF NOT EXISTS translations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key to messages table (optional - null for cached translations without message)
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Translation content
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  
  -- Language codes (ISO 639-1)
  source_lang VARCHAR(10),  -- NULL means auto-detected
  target_lang VARCHAR(10) NOT NULL,
  
  -- Translation provider info
  translation_provider VARCHAR(20) DEFAULT 'deepl',
  
  -- Metadata (optional, for monitoring)
  response_time_ms INTEGER,  -- API response time in milliseconds
  character_count INTEGER,    -- Character count for future usage tracking
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for caching (one translation per message + target lang + provider)
  CONSTRAINT unique_translation_per_message 
    UNIQUE(message_id, target_lang, translation_provider)
);

-- ================================================
-- 2. INDEXES for performance
-- ================================================

-- Index for looking up translations by message
CREATE INDEX IF NOT EXISTS idx_translations_message 
  ON translations(message_id) 
  WHERE message_id IS NOT NULL;

-- Index for cache lookups (most frequent query pattern)
CREATE INDEX IF NOT EXISTS idx_translations_message_cache 
  ON translations(message_id, target_lang, translation_provider)
  WHERE message_id IS NOT NULL;

-- Index for recent translations
CREATE INDEX IF NOT EXISTS idx_translations_created 
  ON translations(created_at DESC);

-- Index for language pairs analysis (optional, for future stats)
CREATE INDEX IF NOT EXISTS idx_translations_langs 
  ON translations(source_lang, target_lang);

-- ================================================
-- 3. RLS (Row Level Security) Policies
-- ================================================

-- Enable RLS on translations table
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on translations" ON translations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 4. COMMENTS for documentation
-- ================================================

COMMENT ON TABLE translations IS '메시지 번역 저장 및 캐싱 테이블';
COMMENT ON COLUMN translations.message_id IS '연관된 메시지 ID (선택적)';
COMMENT ON COLUMN translations.original_text IS '원본 텍스트';
COMMENT ON COLUMN translations.translated_text IS '번역된 텍스트';
COMMENT ON COLUMN translations.source_lang IS '원본 언어 코드 (NULL = 자동 감지)';
COMMENT ON COLUMN translations.target_lang IS '대상 언어 코드';
COMMENT ON COLUMN translations.translation_provider IS '번역 제공자 (deepl, google, etc)';
COMMENT ON COLUMN translations.response_time_ms IS 'API 응답 시간 (밀리초)';
COMMENT ON COLUMN translations.character_count IS '문자 수 (향후 사용량 추적용)';

-- ================================================
-- END OF SCRIPT
-- ================================================