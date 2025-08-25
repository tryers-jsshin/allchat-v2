# Instagram User Profile 기능 구현 문서

## 📋 개요

Instagram User Profile API를 활용하여 메시지를 보낸 사용자들의 프로필 정보를 자동으로 수집하고 관리하는 기능을 구현했습니다. 이 기능은 사용자 동의를 기반으로 작동하며, 효율적인 캐싱과 실시간 업데이트를 지원합니다.

## 🎯 주요 기능

### 1. 자동 프로필 수집
- 웹훅을 통해 메시지를 받을 때 자동으로 발신자 프로필 정보 수집
- 사용자 동의 확인 (메시지 전송 = 동의)
- 비동기 처리로 웹훅 응답 속도에 영향 없음

### 2. 프로필 정보 캐싱
- 24시간 캐시 유효 기간
- 프로필 사진 URL 만료 추적 (3일)
- 중복 API 호출 최소화

### 3. 프로필 관리 대시보드
- 전체 프로필 목록 조회
- 검색 및 필터링 (인증 계정, 팔로잉 관계)
- 정렬 옵션 (최근 메시지, 팔로워 수, 메시지 수)
- 배치 업데이트 기능

### 4. 프로필 표시 통합
- 웹훅 대시보드에 발신자 프로필 미니 카드 표시
- 상세 보기에서 전체 프로필 정보 표시
- 실시간 프로필 업데이트

## 🗄️ 데이터베이스 스키마

### instagram_user_profiles 테이블

```sql
CREATE TABLE instagram_user_profiles (
    id UUID PRIMARY KEY,
    igsid TEXT UNIQUE NOT NULL,          -- Instagram-scoped ID
    
    -- 프로필 정보
    name TEXT,                           -- 사용자 이름
    username TEXT,                        -- Instagram 사용자명
    profile_pic TEXT,                     -- 프로필 사진 URL
    profile_pic_updated_at TIMESTAMP,    -- 프로필 사진 업데이트 시간
    follower_count INTEGER,               -- 팔로워 수
    is_verified_user BOOLEAN,            -- 인증 계정 여부
    
    -- 관계 정보
    is_user_follow_business BOOLEAN,     -- 사용자가 비즈니스를 팔로우
    is_business_follow_user BOOLEAN,     -- 비즈니스가 사용자를 팔로우
    
    -- 동의 및 캐시
    has_user_consent BOOLEAN,            -- 동의 여부
    consent_granted_at TIMESTAMP,        -- 동의 시간
    cache_expires_at TIMESTAMP,          -- 캐시 만료 시간
    last_fetched_at TIMESTAMP,           -- 마지막 API 호출 시간
    
    -- 메타데이터
    fetch_count INTEGER,                 -- API 호출 횟수
    fetch_error TEXT,                    -- 마지막 에러
    first_message_at TIMESTAMP,          -- 첫 메시지 시간
    last_message_at TIMESTAMP,           -- 마지막 메시지 시간
    total_messages INTEGER,              -- 총 메시지 수
    notes TEXT                           -- 관리자 메모
)
```

## 🔌 API 엔드포인트

### 1. 개별 프로필 조회
```
GET /api/profiles/[igsid]
GET /api/profiles/[igsid]?refresh=true  // 강제 새로고침
```

**응답 예시:**
```json
{
  "source": "cache",
  "profile": {
    "igsid": "123456789",
    "name": "홍길동",
    "username": "hong_gildong",
    "profile_pic": "https://...",
    "follower_count": 12345,
    "is_verified_user": true,
    "is_user_follow_business": true,
    "is_business_follow_user": false
  },
  "expires_at": "2025-01-27T12:00:00Z"
}
```

### 2. 배치 프로필 조회
```
POST /api/profiles/batch
```

**요청 본문:**
```json
{
  "igsids": ["123456", "789012", "345678"]
}
```

**응답 예시:**
```json
{
  "profiles": [...],
  "summary": {
    "requested": 3,
    "cached": 1,
    "fetched": 2,
    "errors": 0
  }
}
```

## 🧩 컴포넌트

### 1. UserProfileCard
사용자 프로필을 표시하는 재사용 가능한 카드 컴포넌트

```tsx
<UserProfileCard 
  igsid="123456789"
  showDetails={true}
  onProfileLoaded={(profile) => console.log(profile)}
/>
```

**Props:**
- `igsid`: Instagram-scoped ID (필수)
- `showDetails`: 상세 정보 표시 여부
- `onProfileLoaded`: 프로필 로드 완료 콜백
- `className`: 추가 CSS 클래스

### 2. ProfileManager
프로필 관리 대시보드 컴포넌트

**기능:**
- 프로필 목록 표시
- 검색 및 필터링
- 배치 업데이트
- 메모 작성
- 실시간 업데이트

## 🔄 웹훅 통합

웹훅 수신 시 자동으로 프로필 정보를 가져오는 로직이 통합되어 있습니다:

```typescript
// src/app/api/webhooks/instagram/route.ts
if (webhookData.sender_id && webhookData.webhook_type === 'message' && !webhookData.is_echo) {
  triggerProfileFetch(webhookData.sender_id).catch(err => {
    console.error('Profile fetch trigger error:', err)
  })
}
```

## 🎨 UI/UX 특징

### 프로필 카드 디자인
- 프로필 사진 (없을 경우 기본 아바타)
- 이름과 사용자명
- 인증 배지 (파란색 체크마크)
- 팔로워 수 (K, M 단위로 축약)
- 팔로우 관계 배지
- 새로고침 버튼

### 대시보드 통계
- 전체 프로필 수
- 인증된 계정 수
- 팔로잉/팔로워 수
- 업데이트 필요한 프로필 수

## 🚨 에러 처리

### 주요 에러 시나리오

1. **사용자 동의 부족**
   - 에러: "User consent is required to access user profile"
   - 처리: 동의 부족 상태로 표시, 메시지 수신 후 재시도

2. **차단된 사용자**
   - 에러: "User has blocked the business"
   - 처리: 비활성 상태로 표시, 프로필 업데이트 중단

3. **프로필 사진 만료**
   - 처리: 3일 이상 된 프로필 사진 자동 갱신

4. **API 제한**
   - 처리: 캐시 활용, 배치 처리로 API 호출 최소화

## 📊 성능 최적화

### 캐싱 전략
- 24시간 캐시 유효 기간
- 캐시 히트 시 DB에서 직접 반환
- 만료된 캐시만 선택적 업데이트

### 배치 처리
- 최대 50개 프로필 동시 처리
- 캐시된 프로필과 새로운 프로필 분리 처리
- 병렬 API 호출로 처리 시간 단축

### 실시간 업데이트
- Supabase Realtime 구독
- 프로필 변경 시 즉시 UI 업데이트
- 불필요한 재렌더링 방지

## 🔐 보안 고려사항

1. **사용자 동의 확인**
   - 메시지 전송 = 암묵적 동의
   - 동의 없이 프로필 접근 차단

2. **액세스 토큰 보호**
   - 환경 변수로 관리
   - 서버 사이드에서만 사용

3. **Rate Limiting**
   - 배치 처리 제한 (최대 50개)
   - 캐시를 통한 API 호출 최소화

## 📝 사용 가이드

### 1. 데이터베이스 설정
```bash
# Supabase SQL Editor에서 실행
supabase_user_profiles.sql
```

### 2. 환경 변수 확인
```env
INSTAGRAM_USER_ACCESS_TOKEN=your-token
INSTAGRAM_BUSINESS_ID=your-business-id
```

### 3. 프로필 관리
1. 메인 페이지에서 "User Profiles" 탭 클릭
2. 프로필 목록에서 사용자 선택
3. 상세 정보 확인 및 메모 작성
4. 필요시 "만료된 프로필 업데이트" 클릭

## 🔄 향후 개선사항

1. **프로필 내보내기**
   - CSV/Excel 형식으로 프로필 데이터 내보내기

2. **고급 분석**
   - 사용자 세그먼트 분석
   - 인게이지먼트 추적

3. **자동화**
   - 정기적인 프로필 업데이트 스케줄링
   - VIP 사용자 자동 태깅

4. **통합**
   - CRM 시스템 연동
   - 마케팅 도구 통합

## 🧪 테스트

### 프로필 API 테스트
```bash
# 개별 프로필 조회
curl http://localhost:3000/api/profiles/123456789

# 배치 프로필 조회
curl -X POST http://localhost:3000/api/profiles/batch \
  -H "Content-Type: application/json" \
  -d '{"igsids": ["123456", "789012"]}'
```

### 웹훅 테스트 (프로필 트리거)
```bash
curl -X POST http://localhost:3000/api/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "messaging": [{
        "sender": {"id": "TEST_USER_123"},
        "recipient": {"id": "789012"},
        "message": {
          "mid": "test-message-id",
          "text": "테스트 메시지"
        }
      }]
    }]
  }'
```

## 📚 참고 자료

- [Instagram User Profile API Documentation](https://developers.facebook.com/docs/instagram/messaging-api/user-profile)
- [Instagram Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)