# SQL Scripts for AllChat

## 📁 File Structure

- `create_translations_table.sql` - 번역 기능을 위한 테이블 생성

## 🚀 How to Execute

### Option 1: Supabase Dashboard (권장)
1. Supabase Dashboard 접속
2. SQL Editor 탭 이동
3. `create_translations_table.sql` 내용 복사/붙여넣기
4. Run 버튼 클릭

### Option 2: Supabase CLI
```bash
supabase db push --file sql/create_translations_table.sql
```

### Option 3: psql
```bash
psql -h [your-supabase-host] -U postgres -d postgres -f sql/create_translations_table.sql
```

## 📊 Created Table

### translations
- 메시지 번역 저장 및 캐싱
- 중복 번역 방지를 위한 유니크 제약
- 메시지 연결 (선택적)
- 캐싱 메커니즘으로 API 호출 최소화

## 🔍 Useful Queries

### 최근 번역 조회
```sql
SELECT * FROM translations 
ORDER BY created_at DESC 
LIMIT 10;
```

### 특정 메시지의 번역 조회
```sql
SELECT * FROM translations 
WHERE message_id = 'your-message-id';
```

### 캐시된 번역 찾기
```sql
SELECT * FROM translations 
WHERE original_text = 'Hello' 
  AND target_lang = 'ko'
  AND translation_provider = 'deepl';
```

### 언어쌍별 번역 통계
```sql
SELECT 
  source_lang,
  target_lang,
  COUNT(*) as translation_count,
  AVG(response_time_ms) as avg_response_time
FROM translations
GROUP BY source_lang, target_lang
ORDER BY translation_count DESC;
```

### 오늘 번역된 메시지 수
```sql
SELECT COUNT(*) as today_translations
FROM translations
WHERE DATE(created_at) = CURRENT_DATE;
```

### 캐시 효율성 확인 (동일 텍스트 재사용)
```sql
SELECT 
  original_text,
  target_lang,
  COUNT(*) as reuse_count
FROM translations
GROUP BY original_text, target_lang
HAVING COUNT(*) > 1
ORDER BY reuse_count DESC;
```