-- Supabase 뷰 정리 스크립트
-- 모든 미사용 뷰를 삭제합니다

-- 1. active_instagram_users 뷰 삭제
DROP VIEW IF EXISTS active_instagram_users CASCADE;

-- 2. instagram_conversations 뷰 삭제 (이전 Conversations API 구현 잔재)
DROP VIEW IF EXISTS instagram_conversations CASCADE;

-- 3. instagram_messages 뷰 삭제 (이전 Conversations API 구현 잔재)
DROP VIEW IF EXISTS instagram_messages CASCADE;

-- 4. instagram_reactions 뷰 삭제 (이전 Conversations API 구현 잔재)
DROP VIEW IF EXISTS instagram_reactions CASCADE;

-- 5. conversation_summary 뷰 삭제 (혹시 남아있을 수 있는 이전 구현)
DROP VIEW IF EXISTS conversation_summary CASCADE;

-- 확인 메시지
SELECT 'All views dropped successfully!' as status;