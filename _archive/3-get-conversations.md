# Instagram Conversations API 가이드

## 개요

이 문서는 앱 사용자와 Instagram 미디어에 관심 있는 Instagram 사용자 간의 대화 정보를 가져오는 방법을 설명합니다.

### 가져올 수 있는 정보
- 앱 사용자의 Instagram 비즈니스 계정에 대한 대화 목록
- 각 대화 내 메시지 목록
- 각 메시지의 세부 정보 (전송 시간, 발신자 등)

## 요구사항

### 액세스 레벨
- **고급 액세스**: 소유하지 않거나 관리하지 않는 Instagram 비즈니스 계정에 서비스를 제공하는 경우
- **표준 액세스**: 소유하거나 관리하며 앱 대시보드에 추가한 Instagram 비즈니스 계정에 서비스를 제공하는 경우

### 액세스 토큰
- Instagram 비즈니스 계정에서 메시지를 관리할 수 있는 사람으로부터 요청된 Instagram 사용자 액세스 토큰

### 기본 URL
모든 엔드포인트는 `graph.instagram.com` 호스트를 통해 액세스할 수 있습니다.

### 엔드포인트
- `/<IG_ID>/conversations` 또는 `/me/conversations`

### 필요한 ID
- Instagram 비즈니스 계정 ID (`<IG_ID>`)
- 대화 상대방의 Instagram-scoped ID

### 권한
- `instagram_business_basic`
- `instagram_business_manage_messages`

## 제한사항

- 공유의 경우 이미지 또는 비디오 URL만 API 호출이나 웹훅 알림에 포함됨
- 요청 폴더에 있으면서 30일 동안 활성화되지 않은 대화는 API 호출에서 반환되지 않음
- 대화의 최근 20개 메시지에 대한 세부 정보만 조회 가능

## API 사용 방법

### 1. 대화 목록 가져오기

Instagram 비즈니스 계정의 모든 대화 목록을 가져옵니다.

```bash
curl -i -X GET "https://graph.instagram.com/v23.0/me/conversations?platform=instagram&access_token=<INSTAGRAM_ACCESS_TOKEN>"
```

**응답 예시:**
```json
{
  "data": [
    {
      "id": "<CONVERSATION_ID_1>",  
      "updated_time": "<UNIX_TIMESTAMP>"
    },
    {
      "id": "<CONVERSATION_ID_2>",   
      "updated_time": "<UNIX_TIMESTAMP>"
    }
  ]
}
```

### 2. 특정 사용자와의 대화 찾기

특정 Instagram 사용자와의 대화를 찾으려면 `user_id` 매개변수를 사용합니다.

```bash
curl -i -X GET "https://graph.instagram.com/v23.0/me/conversations?user_id=<IGSID>&access_token=<INSTAGRAM_ACCESS_TOKEN>"
```

**응답 예시:**
```json
{
  "data": [
    {
      "id": "<CONVERSATION_ID>"
    }
  ]
}
```

### 3. 대화의 메시지 목록 가져오기

특정 대화의 모든 메시지 ID와 생성 시간을 가져옵니다.

```bash
curl -i -X GET "https://graph.instagram.com/v23.0/<CONVERSATION_ID>?fields=messages&access_token=<INSTAGRAM_ACCESS_TOKEN>"
```

**응답 예시:**
```json
{
  "messages": {
    "data": [
      {
        "id": "<MESSAGE_1_ID>",      
        "created_time": "<UNIX_TIMESTAMP_MOST_RECENT_MESSAGE>"  
      },
      {
        "id": "<MESSAGE_2_ID>",
        "created_time": "<UNIX_TIMESTAMP>"
      },
      {
        "id": "<MESSAGE_3_ID>",
        "created_time": "<UNIX_TIMESTAMP>"
      }
    ]
  },
  "id": "<CONVERSATION_ID>"
}
```

### 4. 메시지 세부 정보 가져오기

특정 메시지의 발신자, 수신자, 내용 등 상세 정보를 가져옵니다.

**중요**: 대화의 최근 20개 메시지에 대해서만 세부 정보를 조회할 수 있습니다. 그보다 오래된 메시지를 조회하면 삭제된 메시지라는 오류가 발생합니다.

```bash
curl -i -X GET "https://graph.instagram.com/v23.0/<MESSAGE_ID>?fields=id,created_time,from,to,message&access_token=<INSTAGRAM_ACCESS_TOKEN>"
```

**기본 필드**: `id`, `created_time`

**응답 예시:**
```json
{
  "id": "aWdGGiblWZ...",
  "created_time": "2022-07-12T19:11:07+0000",
  "to": {
    "data": [
      {
        "username": "<IG_ID_USERNAME>",
        "id": "<IG_ID>"
      }
    ]
  },
  "from": {
    "username": "<IGSID_USERNAME>",
    "id": "<IGSID>"
  },
  "message": "Hi Kitty!"
}
```

## 사용 시나리오

### 고객 지원 시스템 구축
```bash
# 1. 모든 대화 목록 조회
curl -i -X GET "https://graph.instagram.com/v23.0/me/conversations?platform=instagram&access_token=<TOKEN>"

# 2. 각 대화의 최신 메시지 확인
curl -i -X GET "https://graph.instagram.com/v23.0/<CONVERSATION_ID>?fields=messages&access_token=<TOKEN>"

# 3. 미답변 메시지 식별 및 응답
```

### 특정 고객과의 대화 이력 조회
```bash
# 1. 고객과의 대화 찾기
curl -i -X GET "https://graph.instagram.com/v23.0/me/conversations?user_id=<CUSTOMER_IGSID>&access_token=<TOKEN>"

# 2. 대화 이력 전체 조회
curl -i -X GET "https://graph.instagram.com/v23.0/<CONVERSATION_ID>?fields=messages&access_token=<TOKEN>"

# 3. 각 메시지 세부 내용 확인 (최근 20개만)
curl -i -X GET "https://graph.instagram.com/v23.0/<MESSAGE_ID>?fields=id,created_time,from,to,message&access_token=<TOKEN>"
```

## 관련 참고 자료

- [Conversations Reference](https://developers.facebook.com/docs/graph-api/reference/conversation#readfields)
- [Conversation Messages Reference](https://developers.facebook.com/docs/graph-api/reference/conversation/messages)
- [Message Reference](https://developers.facebook.com/docs/graph-api/reference/message)

## 주요 포인트

- **대화 조회**: 전체 대화 목록 또는 특정 사용자와의 대화를 찾을 수 있음
- **메시지 목록**: 대화의 모든 메시지 ID는 조회 가능하지만 세부 내용은 최근 20개만 확인 가능
- **실시간 모니터링**: 웹훅과 함께 사용하여 실시간 고객 지원 시스템 구축 가능
- **30일 제한**: 요청 폴더의 비활성 대화는 30일 후 API에서 제외됨