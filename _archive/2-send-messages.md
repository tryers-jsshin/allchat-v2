# Instagram Messaging API 가이드

## 개요

이 가이드는 Instagram Login을 통한 Instagram API를 사용하여 Instagram 비즈니스 계정에서 사용자에게 메시지를 보내는 방법을 설명합니다.

## 작동 방식

Instagram API with Instagram Login을 통해 앱 사용자는 Instagram 비즈니스 계정과 고객, 잠재 고객, 팔로워 간에 메시지를 주고받을 수 있습니다.

### 메시지 흐름

1. **Instagram 사용자가 메시지 전송**: 대화는 Instagram 사용자가 앱 사용자의 Instagram 피드, 게시물, 스토리 멘션 등을 통해 메시지를 보낼 때만 시작됩니다.

2. **웹훅 알림 전송**: Instagram 사용자가 앱 사용자에게 메시지를 보내면 이벤트가 트리거되고 웹훅 서버로 알림이 전송됩니다.

3. **메시지 응답**: Instagram 사용자가 앱 사용자의 Instagram 비즈니스 계정으로 메시지를 보낸 후에만 앱에서 해당 사용자에게 메시지를 보낼 수 있습니다. **24시간 응답 제한**이 있습니다.

### Instagram 받은편지함

- **일반**: 앱을 통해 응답한 후에만 대화가 일반 폴더로 이동
- **기본**: 팔로워의 새로운 대화는 기본 폴더에 나타남
- **요청**: 팔로워가 아닌 사용자의 새로운 대화는 요청 폴더에 나타남

### 받은편지함 제한사항

- 받은편지함 폴더는 지원되지 않음
- API를 통해 전달된 웹훅 알림이나 메시지는 Instagram 앱 받은편지함에서 '읽음'으로 간주되지 않음
- 답장을 보낸 후에만 메시지가 '읽음'으로 간주됨

## 메시지 유형

다음 유형의 메시지를 보낼 수 있습니다:

- 오디오 파일
- GIF
- 이미지
- Instagram 게시물 (앱 사용자 소유)
- 링크
- 반응
- 스티커
- 템플릿
- 텍스트
- 비디오

## 요구사항

### 액세스 레벨
- **고급 액세스**: 소유하지 않거나 관리하지 않는 Instagram 비즈니스 계정에 서비스를 제공하는 경우
- **표준 액세스**: 소유하거나 관리하는 Instagram 비즈니스 계정에 서비스를 제공하는 경우

### 액세스 토큰
- Instagram 비즈니스 계정에서 메시지를 보낼 수 있는 사람으로부터 요청된 Instagram 사용자 액세스 토큰

### 기본 URL
모든 엔드포인트는 `graph.instagram.com` 호스트를 통해 액세스할 수 있습니다.

### 엔드포인트
- `/<IG_ID>/messages` 또는 `/me/messages`

### 필수 매개변수
- `recipient:{id:<IGSID>}`
- `message:{<MESSAGE_ELEMENTS>}`

### 권한
- `instagram_business_basic`
- `instagram_business_manage_messages`

### 웹훅 이벤트 구독
- `messages`
- `messaging_optins`
- `messaging_postbacks`
- `messaging_reactions`
- `messaging_referrals`
- `messaging_seen`

### 미디어 유형 및 사양

| 미디어 유형 | 지원 형식 | 최대 크기 |
|------------|-----------|----------|
| 오디오 | aac, m4a, wav, mp4 | 25MB |
| 이미지 | png, jpeg, gif | 8MB |
| 비디오 | mp4, ogg, avi, mov, webm | 25MB |

## API 사용 예제

### 텍스트 메시지 보내기

```bash
curl -X POST "https://graph.instagram.com/v23.0/<IG_ID>/messages" \
     -H "Authorization: Bearer <INSTAGRAM_USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "recipient":{
               "id":"<IGSID>"
           },
           "message":{
              "text":"<TEXT_OR_LINK>"
           }
        }'
```

### 이미지 또는 GIF 보내기

```bash
curl -X POST "https://graph.instagram.com/v23.0/<IG_ID>/messages" \
     -H "Authorization: Bearer <INSTAGRAM_USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "recipient":{
               "id":"<IGSID>"
           },
           "message":{
              "attachment":{
               "type":"image",
               "payload":{
                 "url":"<IMAGE_OR_GIF_URL>"
               }
             }
           }
         }'
```

### 오디오 또는 비디오 보내기

```bash
curl -X POST "https://graph.instagram.com/v23.0/<IG_ID>/messages" \
     -H "Authorization: Bearer <INSTAGRAM_USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "recipient":{
               "id":"<IGSID>"
           },
           "message":{
              "attachment":{
               "type":"audio",
               "payload":{
                 "url":"<AUDIO_OR_VIDEO_FILE_URL>"
               }
             }
          }
        }'
```

### 스티커 보내기

```bash
curl -X POST "https://graph.instagram.com/v23.0/<IG_ID>/messages" \
     -H "Authorization: Bearer <INSTAGRAM_USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "recipient":{
               "id":"<IGSID>"
           },
           "message":{
              "attachment":{
                "type":"like_heart"
              }
            }
         }'
```

### 메시지에 반응하기

```bash
curl -X POST "https://graph.instagram.com/v23.0/<IG_ID>/messages" \
     -H "Authorization: Bearer <INSTAGRAM_USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "recipient":{
               "id":"<IGSID>"
           },
           "sender_action":"react",
           "payload":{
             "message_id":"<MESSAGE_ID>",
             "reaction":"love"
           }
         }'
```

### 게시물 공유하기

```bash
curl -X POST "https://graph.instagram.com/v23.0/<IG_ID>/messages" \
     -H "Authorization: Bearer <INSTAGRAM_USER_ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
           "recipient":{
               "id":"<IGSID>"
           },
           "message":{
              "attachment":{
                "type":"MEDIA_SHARE",
                "payload":{
                  "id":"<POST_ID>"
                }
              }
           }
        }'
```

## 제한사항

- 앱 사용자는 메시지에 사용할 모든 미디어나 게시물을 소유해야 함
- 그룹 메시지는 지원되지 않음 (1:1 대화만 가능)
- 30일 동안 활성화되지 않은 요청 폴더의 메시지는 API 호출에서 반환되지 않음
- 고객이 공유가 포함된 메시지를 보낼 때 공유된 미디어나 게시물의 URL만 웹훅 알림에 포함됨
- 앱 테스터는 앱에 대한 역할을 가지고 있어야 하며, 모든 필수 권한에 대한 액세스를 허용하고 앱을 소유하는 Instagram 비즈니스 계정에 대한 역할을 가져야 함

## 자동화 경험 관련 법적 요구사항

다음과 같은 경우 자동화된 서비스와 상호작용하고 있음을 공개해야 합니다:

- 대화 또는 메시지 스레드 시작 시
- 상당한 시간이 경과한 후
- 인간과의 상호작용에서 자동 경험으로 전환될 때

**특별 주의 대상:**
- 캘리포니아 시장 또는 캘리포니아 사용자
- 독일 시장 또는 독일 사용자

**공지 예시:**
- "저는 [페이지 이름] 봇입니다"
- "회원님은 자동 채팅 환경과 상호 작용하고 있습니다"
- "회원님은 봇과 이야기하는 중입니다"
- "저는 자동 챗봇입니다"

## 다음 단계

추가 기능 학습:
- [Private Reply](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/private-replies)
- [Quick Reply](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/quick-replies)
- [Template](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/generic-template)