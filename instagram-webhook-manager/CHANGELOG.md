# Changelog

## 2025-08-26

### UI/UX 개선 사항

#### 전체 레이아웃
- **헤더 추가**: "AllChat 통합 메신저 상담 관리 시스템" 헤더 추가 후 제거
- **Border 통일**: 모든 영역의 border 색상을 `border-gray-200`으로 통일
- **Border 굵기 조정**: 대화 목록의 왼쪽 border를 `border-l-4`에서 `border-l-2`로 변경

#### 대화 목록 (ConversationsList)
- **탭 스타일링**:
  - 폰트 크기를 모두 `text-xs`로 통일
  - 카운트 숫자를 텍스트와 동일한 크기로 조정
  - 탭 내부 간격 최적화

- **대화 카드 디자인**:
  - 고정 높이 80px (`h-20`) 설정
  - 프로필 이미지 크기를 40px로 조정
  - 수직 중앙 정렬 적용
  - 계정 이름 font-weight를 `font-medium`으로 변경
  
- **메시지 미리보기**:
  - 2줄 표시 지원 (`line-clamp-2`)
  - 줄바꿈 보존 (`whitespace: pre-wrap`)
  - 긴 단어 자동 줄바꿈 (`wordBreak: break-word`)
  - 줄 간격 1.3으로 설정
  - Ellipsis 처리 추가

- **읽지 않은 메시지 뱃지**:
  - 크기 축소: 18px x 18px
  - 상단 정렬 유지 (`-mt-0.5`)
  - 뱃지가 없어도 공간 보존 (`min-w-[18px]`)

#### 대화창 (ConversationView)
- **헤더 개선**:
  - 고객명 옆에 Instagram 아이콘 추가
  - "Instagram Direct Message" 텍스트 제거
  - 플랫폼 아이콘으로 채널 표시

- **메시지 입력창**:
  - 레이아웃: `items-center`로 수직 중앙 정렬
  - 패딩: `px-4 py-3`으로 조정
  - Textarea 스타일:
    - Border: `border-gray-300`
    - 모서리: `rounded-2xl`
    - 패딩: `px-4 py-2`
    - 최소 높이: 36px
    - Placeholder: "메시지 입력..."으로 단순화
  - 전송 버튼:
    - 종이비행기 아이콘으로 변경
    - 45도 회전 (`rotate-45`)
    - 색상: `bg-blue-500`
  - 파일 첨부 버튼:
    - 크기: `p-2`
    - 비활성화 상태 시각화

### 상태 관리 개선
- **상담 상태 변경**:
  - "상담 완료" 버튼 클릭 시 status를 `completed`로 변경
  - 완료 상태에서 메시지 수신 시 자동으로 `in_progress`로 변경
  - 상태 변경 시 실시간 탭 간 이동
  - 상태별 카운트 실시간 업데이트

- **용어 변경**:
  - `pending` → `in_progress`로 전체 변경
  - "대기" → "진행중"으로 표시

### 실시간 업데이트
- **대화 목록 실시간 동기화**:
  - Realtime subscription의 closure 문제 해결 (useRef 사용)
  - UPDATE 이벤트 처리 단순화
  - 중복 대화 방지 로직 개선
  
- **탭별 카운트 업데이트**:
  - 상태 변경 시 API를 통한 카운트 갱신
  - 로컬 카운트 계산 대신 서버 데이터 사용

### 스크롤 동작 개선
- **대화창 스크롤**:
  - 읽지 않은 메시지가 없으면 최하단으로 스크롤
  - 읽지 않은 메시지가 있으면 첫 번째 읽지 않은 메시지로 스크롤
  - 이미지 크기 고정으로 스크롤 위치 안정화

### 기술적 개선
- **성능 최적화**:
  - 불필요한 렌더링 방지
  - 메모이제이션 활용
  - 실시간 구독 최적화

- **코드 품질**:
  - TypeScript 타입 정의 개선
  - 에러 핸들링 강화
  - 코드 일관성 유지

## 주요 파일 변경 사항
- `/src/components/ConversationsList.tsx`: 대화 목록 UI 전면 개선
- `/src/components/ConversationView.tsx`: 대화창 헤더 및 입력창 개선
- `/src/components/ConversationsPage.tsx`: 전체 레이아웃 구조 개선
- `/auto_reopen_on_message.sql`: 상태 자동 변경 트리거