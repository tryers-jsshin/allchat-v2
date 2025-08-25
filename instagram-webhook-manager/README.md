# Instagram Webhook Manager

Instagram 메시지 웹훅을 수신하고 Supabase 데이터베이스에 저장하는 Next.js 애플리케이션입니다.

## 기능

### 웹훅 수신
- Instagram 웹훅 검증 (GET 요청)
- 다양한 웹훅 유형 지원:
  - 텍스트 메시지 및 첨부파일 (이미지, 비디오, 오디오)
  - 메시지 반응 (좋아요 등)
  - 포스트백 (버튼 클릭)
  - 메시지 읽음 확인
  - 리퍼럴 (광고, 제품 링크)
  - 사라지는 미디어
  - 스토리 답장
  - Echo 메시지 (보낸 메시지 확인)
- 페이로드 서명 검증 (SHA256)
- JSONB 형태로 원본 데이터 저장
- 상세한 메타데이터 추출 및 인덱싱

### 메시지 전송
- 다양한 메시지 유형 지원:
  - 텍스트 메시지
  - 이미지/GIF (최대 8MB)
  - 비디오 (최대 25MB)
  - 오디오 (최대 25MB)
  - 하트 스티커
  - 메시지 반응 (love, wow, sad, angry, like, haha)
  - Instagram 게시물 공유
- 24시간 응답 시간 제한 관리
- 사용자 인터페이스로 간편한 메시지 전송

### 대시보드
- 실시간 웹훅 대시보드 (Supabase Realtime)
  - 웹훅 발생 시에만 자동 업데이트
  - 불필요한 폴링 제거로 성능 최적화
- 메시지 전송 UI
- 웹훅과 메시지 간 탭 전환

## 설정 방법

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 데이터베이스 테이블 생성:
   - **신규 설치**: `supabase_schema_v2.sql` 파일의 SQL 실행 (모든 웹훅 유형 지원)
   - **기존 테이블 업그레이드**: 기존 데이터를 백업한 후 v2 스키마 적용
   - Supabase Dashboard > SQL Editor에서 실행

### 2. 환경 변수 설정

`.env.local` 파일을 수정하여 실제 값을 입력:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Instagram Webhook Configuration
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your-verify-token
INSTAGRAM_APP_SECRET=your-app-secret

# Instagram API Configuration (for sending messages)
INSTAGRAM_USER_ACCESS_TOKEN=your-instagram-user-access-token
INSTAGRAM_BUSINESS_ID=your-instagram-business-account-id
```

### 3. 애플리케이션 실행

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

### 4. Instagram 웹훅 설정

1. Meta App Dashboard에서 Webhooks 설정
2. Callback URL: `https://your-domain.com/api/webhooks/instagram`
3. Verify Token: 환경 변수의 `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` 값 사용
4. 구독할 필드 선택:
   - `messages`
   - `message_reactions`
   - `messaging_postbacks`
   - 기타 필요한 필드

## 엔드포인트

### 웹훅 수신
- **GET** `/api/webhooks/instagram` - 웹훅 검증
- **POST** `/api/webhooks/instagram` - 웹훅 데이터 수신

### 대시보드 API
- **GET** `/api/webhooks` - 저장된 웹훅 목록 조회

### 메시지 전송 API
- **POST** `/api/messages/send` - Instagram 메시지 전송
  - 지원 메시지 유형: text, image, gif, video, audio, sticker, reaction, media_share

## 프로젝트 구조

```
instagram-webhook-manager/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   ├── instagram/
│   │   │   │   │   └── route.ts    # Instagram 웹훅 처리
│   │   │   │   └── route.ts        # 웹훅 목록 API
│   │   │   └── messages/
│   │   │       └── send/
│   │   │           └── route.ts    # 메시지 전송 API
│   │   └── page.tsx                # 메인 페이지
│   ├── components/
│   │   ├── WebhookDashboard.tsx    # 대시보드 컴포넌트
│   │   └── MessageSender.tsx       # 메시지 전송 컴포넌트
│   └── lib/
│       ├── supabase.ts             # Supabase 클라이언트 및 타입 정의
│       └── webhook-utils.ts        # 웹훅 파싱 및 검증 함수
├── supabase_schema.sql             # 기본 데이터베이스 스키마
├── supabase_schema_v2.sql          # 확장 데이터베이스 스키마 (모든 웹훅 유형)
└── .env.local                      # 환경 변수
```

## 테스트 방법

### 1. 웹훅 검증 테스트

```bash
curl "http://localhost:3000/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=your-verify-token&hub.challenge=test123"
```

### 2. 웹훅 수신 테스트

```bash
curl -X POST http://localhost:3000/api/webhooks/instagram \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "messaging": [{
        "sender": {"id": "123456"},
        "recipient": {"id": "789012"},
        "message": {
          "mid": "test-message-id",
          "text": "테스트 메시지"
        }
      }]
    }]
  }'
```

### 3. 메시지 전송 테스트

```bash
# 텍스트 메시지 전송
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "IGSID-HERE",
    "messageType": "text",
    "content": "Hello from API!",
    "accessToken": "YOUR-ACCESS-TOKEN"
  }'

# 이미지 전송
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "IGSID-HERE",
    "messageType": "image",
    "mediaUrl": "https://example.com/image.jpg",
    "accessToken": "YOUR-ACCESS-TOKEN"
  }'
```

## 주의사항

- 프로덕션 환경에서는 반드시 `INSTAGRAM_APP_SECRET`을 설정하여 페이로드 서명을 검증하세요
- Instagram API 메시지 전송 시 24시간 응답 제한이 있습니다 (사용자가 먼저 메시지를 보낸 후 24시간 이내에만 응답 가능)
- 메시지 전송을 위해서는 Instagram User Access Token과 필요한 권한이 필요합니다
- Supabase의 Row Level Security(RLS) 정책을 프로덕션 요구사항에 맞게 조정하세요
- Rate limiting과 에러 모니터링을 추가로 구현하는 것을 권장합니다

## 지원하는 웹훅 유형

1. **메시지** (`message`)
   - 텍스트, 이미지, 비디오, 오디오
   - 스토리 멘션, 릴, 파일 첨부
   - 빠른 답장, 인라인 답장

2. **반응** (`reaction`)
   - 메시지에 대한 좋아요/반응
   - 반응 제거

3. **포스트백** (`postback`)
   - 아이스브레이커 버튼 클릭
   - CTA 버튼 응답

4. **읽음 확인** (`read`)
   - 메시지 읽음 상태

5. **리퍼럴** (`referral`)
   - 광고 클릭
   - Instagram Shop 제품 클릭
   - IGME 링크

6. **사라지는 미디어** (`ephemeral`)
   - 일시적 미디어 수신

## 다음 단계

- [ ] 메시지 답장 기능 구현
- [ ] 사용자 프로필 정보 조회 (API 연동)
- [ ] 대화 스레드 관리
- [ ] 실시간 알림 (Supabase Realtime)
- [ ] 고급 메시지 필터링 및 검색
- [ ] 자동 응답 봇 기능
- [ ] 분석 대시보드
