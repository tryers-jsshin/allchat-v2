# Product Requirements Document (PRD)
# Instagram Webhook Manager

## 1. 제품 개요

### 1.1 제품명
Instagram Webhook Manager

### 1.2 제품 설명
Instagram 비즈니스 계정의 메시징 웹훅을 실시간으로 수신하고 관리하는 웹 애플리케이션입니다. Meta의 Instagram Messaging API와 연동하여 모든 메시지 이벤트를 Supabase 데이터베이스에 저장하고, 실시간 대시보드를 통해 모니터링할 수 있습니다.

### 1.3 목적
- Instagram 비즈니스 계정의 메시지를 중앙화된 시스템에서 관리
- 실시간 메시지 모니터링 및 분석
- 향후 자동 응답 및 고객 관리 시스템의 기반 구축

### 1.4 대상 사용자
- Instagram 비즈니스 계정 운영자
- 소셜 미디어 매니저
- 고객 서비스 팀
- 마케팅 담당자

## 2. 기술 스택

### 2.1 프론트엔드
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Real-time**: Supabase Realtime Client

### 2.2 백엔드
- **API Routes**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: SHA256 signature verification
- **Webhook Processing**: Node.js

### 2.3 인프라
- **Hosting**: Vercel (권장) 또는 자체 서버
- **Database**: Supabase Cloud
- **CDN**: 자동 (Vercel)

## 3. 핵심 기능

### 3.1 웹훅 수신 및 검증
#### 3.1.1 웹훅 엔드포인트
- **Endpoint**: `/api/webhooks/instagram`
- **Methods**: 
  - GET: Meta 웹훅 검증
  - POST: 웹훅 데이터 수신

#### 3.1.2 보안
- SHA256 서명 검증을 통한 페이로드 무결성 확인
- 환경 변수를 통한 시크릿 관리
- 개발/프로덕션 환경별 검증 로직

#### 3.1.3 지원 웹훅 유형
1. **메시지 (message)**
   - 텍스트 메시지
   - 미디어 첨부 (이미지, 비디오, 오디오, 파일)
   - 스토리 멘션
   - 릴(Reel)
   - 빠른 답장
   - 인라인 답장

2. **반응 (reaction)**
   - 메시지 좋아요
   - 반응 추가/제거

3. **포스트백 (postback)**
   - 아이스브레이커 버튼 클릭
   - CTA 버튼 응답

4. **읽음 확인 (read)**
   - 메시지 읽음 상태

5. **리퍼럴 (referral)**
   - 광고 클릭
   - Instagram Shop 제품 클릭
   - IGME 링크

6. **사라지는 미디어 (ephemeral)**
   - 일시적 미디어 수신

### 3.2 데이터 저장 및 관리

#### 3.2.1 데이터베이스 스키마
```sql
instagram_webhooks 테이블:
- id (UUID): 기본 키
- webhook_type (TEXT): 웹훅 유형
- raw_data (JSONB): 원본 페이로드
- entry_id, entry_time: Entry 레벨 데이터
- sender_id, recipient_id: 대화 참여자
- message_id, message_text: 메시지 정보
- attachments, attachment_types: 첨부파일
- 반응, 포스트백, 리퍼럴 관련 필드
- 타임스탬프 및 처리 상태
```

#### 3.2.2 인덱싱 전략
- 대화별 조회 (sender_id, recipient_id)
- 시간순 정렬 (message_timestamp)
- 웹훅 유형별 필터링
- 텍스트 검색 (GIN index)
- 첨부파일 유형 검색

#### 3.2.3 데이터 파싱
- 모든 웹훅 유형 자동 파싱
- 중요 필드 추출 및 정규화
- JSONB 형태로 원본 데이터 보존

### 3.3 실시간 대시보드

#### 3.3.1 실시간 업데이트
- Supabase Realtime 구독
- 웹훅 발생 시 즉시 UI 업데이트
- 폴링 없는 효율적인 구조

#### 3.3.2 대시보드 기능
- **웹훅 목록**
  - 최근 100개 웹훅 표시
  - 웹훅 유형별 색상 구분
  - 첨부파일 아이콘 표시
  - 메시지 미리보기

- **상세 정보 패널**
  - 전체 페이로드 조회
  - 구조화된 필드 표시
  - 첨부파일 링크
  - 메타데이터 표시

#### 3.3.3 UI/UX
- 반응형 디자인
- 실시간 연결 상태 표시
- 웹훅 유형별 시각적 구분
- 직관적인 정보 계층 구조

### 3.4 API 엔드포인트

#### 3.4.1 웹훅 수신
```
GET /api/webhooks/instagram
- hub.mode: subscribe
- hub.verify_token: 검증 토큰
- hub.challenge: 챌린지 값

POST /api/webhooks/instagram
- Headers: x-hub-signature-256
- Body: Instagram webhook payload
```

#### 3.4.2 데이터 조회
```
GET /api/webhooks
- 저장된 웹훅 목록 조회
- 최근 100개 반환
- 시간 역순 정렬
```

## 4. 보안 요구사항

### 4.1 인증 및 권한
- 웹훅 엔드포인트: 서명 검증
- 대시보드: 향후 인증 시스템 추가 예정
- Row Level Security (RLS) 활성화

### 4.2 데이터 보호
- 환경 변수를 통한 시크릿 관리
- HTTPS 전용 통신
- 페이로드 서명 검증 (SHA256)

### 4.3 접근 제어
- Anonymous INSERT (웹훅 수신용)
- Authenticated SELECT (대시보드용)
- 향후 역할 기반 접근 제어 구현

## 5. 성능 요구사항

### 5.1 응답 시간
- 웹훅 검증: < 1초
- 웹훅 처리: < 2초
- 대시보드 로딩: < 3초

### 5.2 확장성
- 초당 100+ 웹훅 처리 가능
- 데이터베이스 인덱싱 최적화
- 실시간 연결 효율적 관리

### 5.3 안정성
- 에러 로깅 및 모니터링
- 실패한 웹훅 재처리 대응
- 데이터베이스 연결 풀 관리

## 6. 설치 및 배포

### 6.1 사전 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase 계정
- Meta App (Instagram Business API 액세스)

### 6.2 환경 변수
```env
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase Anon Key>
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<Verify Token>
INSTAGRAM_APP_SECRET=<App Secret>
```

### 6.3 설치 단계
1. 프로젝트 클론
2. 의존성 설치 (`npm install`)
3. Supabase 테이블 생성 (supabase_schema_v2.sql)
4. 환경 변수 설정
5. 개발 서버 실행 (`npm run dev`)
6. Meta App Dashboard에서 웹훅 설정

### 6.4 프로덕션 배포
- Vercel 배포 권장
- 환경 변수 설정
- 도메인 연결
- SSL 인증서 자동 적용

## 7. 향후 로드맵

### 7.1 단기 (1-2개월)
- [ ] 메시지 답장 기능 구현
- [ ] 사용자 프로필 정보 조회 (Instagram API)
- [ ] 대화 스레드 관리
- [ ] 메시지 필터링 및 검색

### 7.2 중기 (3-6개월)
- [ ] 자동 응답 봇 기능
- [ ] 고급 분석 대시보드
- [ ] 팀 협업 기능
- [ ] 멀티 계정 지원
- [ ] 웹훅 재전송 메커니즘

### 7.3 장기 (6개월+)
- [ ] AI 기반 메시지 분류
- [ ] 감정 분석
- [ ] CRM 시스템 통합
- [ ] 대량 메시지 관리
- [ ] 고급 자동화 워크플로우

## 8. 테스트 전략

### 8.1 단위 테스트
- 웹훅 파싱 함수
- 서명 검증 로직
- 데이터 변환 유틸리티

### 8.2 통합 테스트
- API 엔드포인트
- 데이터베이스 연동
- 실시간 업데이트

### 8.3 E2E 테스트
- 웹훅 수신 플로우
- 대시보드 인터랙션
- 실시간 동기화

## 9. 모니터링 및 분석

### 9.1 로깅
- 웹훅 수신 로그
- 에러 추적
- 성능 메트릭

### 9.2 알림
- 웹훅 처리 실패
- 데이터베이스 연결 오류
- 비정상적인 트래픽

### 9.3 대시보드 메트릭
- 일일 웹훅 수
- 응답 시간 추이
- 에러율
- 웹훅 유형별 통계

## 10. 문서화

### 10.1 개발자 문서
- API 레퍼런스
- 데이터베이스 스키마
- 배포 가이드
- 트러블슈팅 가이드

### 10.2 사용자 문서
- 설치 가이드
- 대시보드 사용법
- FAQ
- 베스트 프랙티스

## 11. 라이선스 및 규정 준수

### 11.1 오픈소스 라이선스
- MIT License (프로젝트)
- 의존성 라이선스 확인

### 11.2 Meta 플랫폼 정책
- Instagram Platform Policy 준수
- 데이터 사용 정책 준수
- 사용자 개인정보 보호

### 11.3 규정 준수
- GDPR (유럽)
- CCPA (캘리포니아)
- 개인정보보호법 (한국)

## 12. 성공 지표 (KPI)

### 12.1 기술적 지표
- 웹훅 처리 성공률 > 99.9%
- 평균 응답 시간 < 500ms
- 시스템 가용성 > 99.5%

### 12.2 비즈니스 지표
- 일일 활성 사용자 수
- 처리된 메시지 수
- 평균 응답 시간 단축률

### 12.3 사용자 만족도
- 대시보드 사용성
- 실시간 업데이트 정확도
- 기능 완성도

---

## 부록

### A. 용어 정의
- **IGSID**: Instagram-scoped ID (사용자 식별자)
- **IGID**: Instagram Business Account ID
- **Webhook**: 실시간 이벤트 알림 메커니즘
- **Postback**: 버튼 클릭 등의 사용자 액션 응답

### B. 참고 자료
- [Instagram Messaging API Documentation](https://developers.facebook.com/docs/instagram-api/guides/messaging)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### C. 변경 이력
- v1.0.0 (2024-12-25): 초기 버전
  - 기본 웹훅 수신 기능
  - 실시간 대시보드
  - 6가지 웹훅 유형 지원

---

*작성일: 2024년 12월 25일*  
*버전: 1.0.0*  
*작성자: Instagram Webhook Manager Team*