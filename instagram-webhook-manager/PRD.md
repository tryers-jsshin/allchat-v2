# Product Requirements Document (PRD)
# Instagram Webhook Manager - AllChat v2

## 1. 제품 개요

### 1.1 제품명
AllChat v2 - Instagram Webhook Manager

### 1.2 제품 설명
Instagram 비즈니스 계정의 메시징을 실시간으로 관리하는 통합 고객 상담 플랫폼입니다. Meta의 Instagram Messaging API와 연동하여 모든 메시지 이벤트를 Supabase 데이터베이스에 저장하고, 실시간 대시보드를 통해 상담 및 관리가 가능합니다. 향후 카카오톡, LINE, WhatsApp 등 다양한 메시징 플랫폼으로 확장 가능한 구조로 설계되었습니다.

### 1.3 목적
- Instagram 비즈니스 계정의 메시지를 중앙화된 시스템에서 관리
- 실시간 고객 상담 및 메시지 관리
- 상담원의 효율적인 업무 처리를 위한 통합 인터페이스 제공
- 멀티 플랫폼 확장을 위한 기반 구축

### 1.4 대상 사용자
- Instagram 비즈니스 계정 운영자
- 고객 상담 팀
- 소셜 미디어 매니저
- 이커머스 운영자

## 2. 기술 스택

### 2.1 프론트엔드
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Font**: Pretendard (한국어 최적화)
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Real-time**: Supabase Realtime Client

### 2.2 백엔드
- **API Routes**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: SHA256 signature verification
- **Webhook Processing**: Node.js
- **Message Sending**: Instagram Graph API

### 2.3 인프라
- **Hosting**: Vercel (권장) 또는 자체 서버
- **Database**: Supabase Cloud
- **CDN**: 자동 (Vercel)
- **Real-time**: WebSocket (Supabase Realtime)

## 3. 핵심 기능 (구현 완료)

### 3.1 3컬럼 레이아웃 UI
#### 3.1.1 레이아웃 구조
- **좌측 패널**: 고객 메시지 리스트
  - 실시간 대화 목록
  - 상태별 필터링 (진행 중, 전체, 완료)
  - 읽지 않은 메시지 카운트
  - 최신 메시지 시간순 자동 정렬
  
- **중앙 패널**: 채팅창
  - 실시간 메시지 송수신
  - 메시지 입력 및 전송
  - 첨부파일 표시
  - 메시지 타임스탬프
  
- **우측 패널**: 상담 어시스턴트
  - 고객 정보 표시
  - 상담 도구 (향후 확장)

#### 3.1.2 UI/UX 특징
- Pretendard 폰트로 한국어 가독성 최적화
- 플랫폼 아이콘 표시 (Instagram)
- 반응형 디자인
- 실시간 상태 업데이트
- 부드러운 애니메이션 전환

### 3.2 상태 관리 시스템
#### 3.2.1 3단계 상태 체계
- **pending** (대기): 고객이 메시지를 보내고 답장 대기 중
- **in_progress** (진행 중): 상담원이 답장한 상태
- **completed** (완료): 상담 완료 처리

#### 3.2.2 상태 전환 로직
- 새 메시지 도착 → `pending`
- 상담원 답장 → `in_progress`
- 상담 완료 처리 → `completed`
- completed 상태에서 고객 새 메시지 → `pending`로 재개

#### 3.2.3 실시간 카운트
- 진행 중: `pending` + `in_progress` 대화 수
- 전체: 모든 대화 수
- 완료: `completed` 대화 수

### 3.3 메시지 송수신
#### 3.3.1 메시지 수신 (Webhook)
- **Endpoint**: `/api/webhooks/instagram`
- SHA256 서명 검증
- 실시간 데이터베이스 저장
- 대화 상태 자동 업데이트

#### 3.3.2 메시지 전송
- **Endpoint**: `/api/messages/send`
- Instagram Graph API 연동
- 텍스트 메시지 전송
- 전송 상태 실시간 반영

### 3.4 실시간 기능
#### 3.4.1 실시간 업데이트
- Supabase Realtime 구독
- 새 메시지 즉시 표시
- 대화 목록 자동 재정렬
- 읽지 않은 메시지 카운트 실시간 업데이트

#### 3.4.2 실시간 동기화
- 다중 사용자 동시 접속 지원
- 상태 변경 즉시 반영
- 메시지 전송/수신 실시간 동기화

### 3.5 사용자 프로필 관리
#### 3.5.1 프로필 자동 조회
- Instagram Graph API 연동
- 프로필 사진, 이름, 사용자명 자동 가져오기
- 인증 배지 표시
- 팔로워 수 표시

#### 3.5.2 프로필 캐싱
- 24시간 캐시 유지
- 자동 갱신 로직
- 동의 상태 관리

## 4. 데이터베이스 구조

### 4.1 현재 구조 (Instagram 전용)
```sql
-- 대화 관리 (플랫폼별 분리 준비)
instagram_conversations:
  - id (UUID)
  - conversation_id (TEXT): "작은ID_큰ID" 형식
  - participant_1_id, participant_2_id
  - business_account_id, customer_id
  - status (pending/in_progress/completed)
  - last_message_at, last_message_text
  - unread_count
  - priority, tags, notes
  - created_at, updated_at

-- 웹훅 데이터
instagram_webhooks:
  - id (UUID)
  - webhook_type (message/reaction/postback/read/referral/ephemeral)
  - raw_data (JSONB)
  - sender_id, recipient_id
  - message_id, message_text
  - attachments, attachment_types
  - 각종 웹훅 타입별 필드
  - created_at

-- 사용자 프로필
instagram_user_profiles:
  - id (UUID)
  - igsid (Instagram-scoped ID)
  - name, username, profile_pic
  - is_verified_user, follower_count
  - has_user_consent
  - cache_expires_at
  - created_at, updated_at

-- 상태 변경 이력 (통합 관리)
conversation_status_history:
  - id (UUID)
  - platform (TEXT): 'instagram'
  - conversation_id
  - old_status, new_status
  - changed_by, reason
  - created_at
```

### 4.2 인덱싱 전략
- 대화별 조회: `(participant_1_id, participant_2_id)`
- 시간순 정렬: `(last_message_at DESC)`
- 상태별 필터링: `(status)`
- 메시지 검색: GIN index on `message_text`
- 실시간 구독: `(conversation_id)`

### 4.3 트리거 및 함수
- `update_or_create_instagram_conversation()`: 웹훅 수신 시 대화 자동 생성/업데이트
- `log_conversation_status_change()`: 상태 변경 이력 자동 기록
- `update_conversation_updated_at()`: updated_at 자동 갱신

## 5. API 엔드포인트

### 5.1 구현 완료 API
```
# 웹훅 수신
GET /api/webhooks/instagram
  - Meta 웹훅 검증
  
POST /api/webhooks/instagram
  - 웹훅 데이터 수신 및 처리

# 대화 관리
GET /api/conversations
  - 대화 목록 조회
  - Query: status (active/all/completed)
  
PATCH /api/conversations
  - 대화 상태 업데이트
  - Body: { conversation_id, status, assigned_to, notes, tags, priority }

# 메시지
GET /api/conversations/[id]/messages
  - 특정 대화의 메시지 목록
  - Query: limit, offset
  
POST /api/messages/send
  - 메시지 전송
  - Body: { recipientId, messageType, messageText }

# 프로필
GET /api/profiles/[igsid]
  - Instagram 사용자 프로필 조회
  - 자동 캐싱 (24시간)
```

## 6. 보안 및 인증

### 6.1 구현된 보안 기능
- SHA256 웹훅 서명 검증
- 환경 변수를 통한 시크릿 관리
- HTTPS 전용 통신
- Row Level Security (RLS) 활성화

### 6.2 개발/프로덕션 분리
- 개발 환경: 서명 검증 실패 시에도 처리 (경고만 표시)
- 프로덕션 환경: 엄격한 서명 검증

## 7. 플랫폼 확장 아키텍처

### 7.1 현재 구조
```
instagram_conversations (플랫폼별 테이블)
    ↓
instagram_webhooks (플랫폼별 웹훅)
    ↓
instagram_user_profiles (플랫폼별 프로필)
```

### 7.2 확장 시 구조
```
instagram_conversations ↘
kakao_conversations     → unified_conversations (View)
line_conversations      ↗

instagram_webhooks
kakao_webhooks        (각 플랫폼 독립 관리)
line_webhooks

conversation_status_history (통합 관리, platform 필드로 구분)
```

### 7.3 View를 통한 통합
```sql
-- 통합 대화 View (향후 구현)
CREATE VIEW unified_conversations AS
SELECT 
  'instagram' as platform,
  conversation_id,
  customer_id,
  status,
  last_message_at
FROM instagram_conversations
UNION ALL
SELECT 
  'kakao' as platform,
  conversation_id,
  customer_id,
  status,
  last_message_at
FROM kakao_conversations;
```

### 7.4 확장 이점
- 플랫폼별 독립적인 구조 유지
- 플랫폼 특화 기능 보존
- 통합 대시보드 쉽게 구현
- 새 플랫폼 추가 시 기존 코드 영향 최소화

## 8. 성능 최적화

### 8.1 구현된 최적화
- 데이터베이스 인덱싱 최적화
- 실시간 구독 효율적 관리
- 메시지 페이징 (50개씩 로드)
- 프로필 24시간 캐싱

### 8.2 성능 지표
- 웹훅 처리: < 500ms
- 메시지 전송: < 1초
- 대화 목록 로드: < 300ms
- 실시간 업데이트: < 100ms

## 9. 향후 로드맵

### 9.1 단기 (1-2개월)
- [x] 3컬럼 레이아웃 구현
- [x] 메시지 송수신 기능
- [x] 실시간 업데이트
- [x] 상태 관리 시스템
- [ ] 메시지 검색 기능
- [ ] 파일 첨부 전송
- [ ] 상담 템플릿 기능

### 9.2 중기 (3-6개월)
- [ ] 카카오톡 채널 통합
- [ ] LINE 공식 계정 통합
- [ ] 통합 대시보드 (unified_conversations)
- [ ] 팀 협업 기능 (담당자 할당)
- [ ] 자동 응답 봇
- [ ] 상담 통계 대시보드

### 9.3 장기 (6개월+)
- [ ] WhatsApp Business 통합
- [ ] 네이버 톡톡 통합
- [ ] WeChat 통합
- [ ] AI 기반 자동 분류
- [ ] 감정 분석
- [ ] CRM 시스템 연동
- [ ] 고급 자동화 워크플로우

## 10. 설치 및 배포

### 10.1 사전 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase 계정
- Meta App (Instagram Business API 액세스)
- Instagram 비즈니스 계정

### 10.2 환경 변수
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase Anon Key>

# Instagram Webhook
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<Verify Token>
INSTAGRAM_APP_SECRET=<App Secret>

# Instagram API
INSTAGRAM_USER_ACCESS_TOKEN=<User Access Token>
INSTAGRAM_BUSINESS_ID=<Business Account ID>
```

### 10.3 설치 단계
1. 프로젝트 클론
   ```bash
   git clone <repository>
   cd instagram-webhook-manager
   ```

2. 의존성 설치
   ```bash
   npm install
   ```

3. Supabase 테이블 생성
   - `migration_to_instagram_conversations.sql` 실행
   - `fix_trigger_function.sql` 실행

4. 환경 변수 설정
   - `.env.local` 파일 생성
   - 필요한 환경 변수 입력

5. 개발 서버 실행
   ```bash
   npm run dev
   ```

6. Meta App Dashboard 설정
   - Webhook URL 등록
   - 필요한 권한 설정

### 10.4 프로덕션 배포
- Vercel 배포 권장
- 환경 변수 설정
- 도메인 연결
- SSL 인증서 자동 적용

## 11. 테스트

### 11.1 테스트 환경
- 로컬 개발: localhost:3000
- ngrok 또는 localtunnel로 웹훅 테스트

### 11.2 테스트 시나리오
- 웹훅 수신 및 검증
- 메시지 송수신
- 실시간 업데이트
- 상태 전환
- 프로필 조회

## 12. 문제 해결

### 12.1 일반적인 문제
- **Invalid Signature**: 개발 환경에서는 정상 (경고만 표시)
- **CORS 에러**: API 라우트 CORS 설정 확인
- **실시간 연결 끊김**: Supabase 연결 상태 확인

### 12.2 디버깅
- 웹훅 로그 확인: 콘솔 출력
- 데이터베이스 쿼리: Supabase 대시보드
- 네트워크 요청: 브라우저 개발자 도구

## 13. 라이선스 및 규정 준수

### 13.1 오픈소스 라이선스
- MIT License (프로젝트)
- 의존성 라이선스 확인 필요

### 13.2 Meta 플랫폼 정책
- Instagram Platform Policy 준수
- 데이터 사용 정책 준수
- 사용자 개인정보 보호

### 13.3 개인정보 보호
- GDPR (유럽)
- CCPA (캘리포니아)
- 개인정보보호법 (한국)

## 14. 성공 지표 (KPI)

### 14.1 기술적 지표
- 웹훅 처리 성공률: > 99.9%
- 평균 응답 시간: < 500ms
- 시스템 가용성: > 99.5%
- 실시간 동기화 정확도: 100%

### 14.2 비즈니스 지표
- 평균 응답 시간 단축: 50% 이상
- 동시 처리 가능 상담: 10+ 건
- 상담 완료율: > 90%

## 15. 부록

### A. 용어 정의
- **IGSID**: Instagram-scoped ID (사용자 식별자)
- **IGID**: Instagram Business Account ID
- **Webhook**: 실시간 이벤트 알림 메커니즘
- **View**: 가상 테이블 (실제 데이터 저장 X, 쿼리 결과만 표시)
- **Materialized View**: 미리 계산된 뷰 (성능 최적화)

### B. 참고 자료
- [Instagram Messaging API Documentation](https://developers.facebook.com/docs/instagram-api/guides/messaging)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### C. 변경 이력
- v2.0.0 (2025-08-25): 메이저 업데이트
  - 3컬럼 레이아웃 구현
  - 메시지 송수신 기능 추가
  - 상태 관리 시스템 개선 (3단계)
  - 플랫폼 확장 아키텍처 설계
  - Pretendard 폰트 적용
  - 실시간 시간순 정렬
  
- v1.0.0 (2024-12-25): 초기 버전
  - 기본 웹훅 수신 기능
  - 실시간 대시보드
  - 6가지 웹훅 유형 지원

---

*최종 수정일: 2025년 8월 25일*  
*버전: 2.0.0*  
*작성자: AllChat Development Team*