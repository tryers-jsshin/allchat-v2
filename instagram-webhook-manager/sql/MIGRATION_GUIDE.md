# 번역 테이블 제약조건 마이그레이션 가이드

## 변경 내용
- **변경 전**: `original_text` 기반 중복 체크 (텍스트가 같으면 재사용)
- **변경 후**: `message_id` 기반 중복 체크 (메시지별 독립적 번역)

## 변경 이유
1. **성능 개선**: 긴 텍스트의 인덱싱 부담 제거
2. **데이터 무결성**: 메시지별 독립적인 번역 관리
3. **확장성**: UUID 인덱싱이 TEXT 인덱싱보다 효율적

## 마이그레이션 실행 방법

### Supabase SQL Editor에서 실행

1. Supabase Dashboard 접속
2. SQL Editor 탭 이동
3. 다음 스크립트 실행:

```sql
-- /sql/migrate_translation_constraints.sql 파일 내용 복사하여 실행
```

### 실행 순서

1. **백업 (권장)**
   ```sql
   -- 기존 번역 데이터 백업
   CREATE TABLE translations_backup AS 
   SELECT * FROM translations;
   ```

2. **마이그레이션 실행**
   ```sql
   -- migrate_translation_constraints.sql 내용 실행
   ```

3. **검증**
   ```sql
   -- 제약조건 확인
   SELECT conname FROM pg_constraint 
   WHERE conrelid = 'translations'::regclass;
   ```

## 영향도

### ✅ 영향 없음
- **프론트엔드**: 이미 message_id 기반으로 동작
- **API**: 이미 message_id로 캐시 체크 중
- **기존 데이터**: message_id가 있는 레코드는 정상 동작

### ⚠️ 주의사항
- message_id가 NULL인 오래된 레코드는 제약조건 영향 없음
- 동일 메시지에 대한 중복 번역 시도시 에러 발생 (정상)

## 롤백 방법

문제 발생시 다음 스크립트로 롤백:

```sql
-- 새 제약조건 삭제
ALTER TABLE translations 
DROP CONSTRAINT IF EXISTS unique_translation_per_message;

-- 원래 제약조건 복원
ALTER TABLE translations 
ADD CONSTRAINT unique_translation_cache 
  UNIQUE(original_text, target_lang, translation_provider);

-- 인덱스 복원
DROP INDEX IF EXISTS idx_translations_message_cache;
CREATE INDEX idx_translations_cache 
  ON translations(original_text, target_lang, translation_provider);
```

## 완료 후 확인사항

1. 번역 기능 정상 동작 확인
2. 캐싱이 message별로 동작하는지 확인
3. API 응답 시간 개선 확인

---

**작성일**: 2025-01-29  
**작성자**: Claude Assistant