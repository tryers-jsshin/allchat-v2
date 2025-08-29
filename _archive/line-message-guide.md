# 메시지 타입별 DB 매핑 가이드

이 문서는 Instagram/LINE 등 다양한 플랫폼에서 수신되는 메시지의 타입별
구조와 DB 매핑 방안을 정리한 것입니다.\
모든 메시지는 `messages` 테이블에 저장되며, 공통 컬럼(`id`,
`conversation_id`, `platform`, `sender_id`, `recipient_id`,
`message_text`, `message_type`, `attachments`)을 기반으로 확장합니다.

------------------------------------------------------------------------

## 1. 텍스트(Text)

-   **message_type**: `text`
-   **message_text**: 본문 텍스트
-   **attachments**: `NULL`

예시:

``` json
{
  "type": "text",
  "id": "123456",
  "text": "Hello!"
}
```

DB 매핑:

``` sql
message_type = 'text'
message_text = 'Hello!'
attachments = NULL
```

------------------------------------------------------------------------

## 2. 이미지(Image)

-   **message_type**: `image`
-   **message_text**: `NULL`
-   **attachments**:

``` json
{
  "type": "image",
  "url": "https://path.to/image.jpg",
  "previewUrl": "https://path.to/preview.jpg"
}
```

------------------------------------------------------------------------

## 3. 비디오(Video)

-   **message_type**: `video`
-   **message_text**: `NULL`
-   **attachments**:

``` json
{
  "type": "video",
  "url": "https://path.to/video.mp4",
  "duration": 12345
}
```

------------------------------------------------------------------------

## 4. 오디오(Audio)

-   **message_type**: `audio`
-   **message_text**: `NULL`
-   **attachments**:

``` json
{
  "type": "audio",
  "url": "https://path.to/audio.m4a",
  "duration": 9876
}
```

------------------------------------------------------------------------

## 5. 파일(File)

-   **message_type**: `file`
-   **message_text**: `파일명` (검색성을 위해)
-   **attachments**:

``` json
{
  "type": "file",
  "fileName": "document.pdf",
  "fileSize": 1048576,
  "url": "https://path.to/document.pdf"
}
```

------------------------------------------------------------------------

## 6. 위치(Location)

-   **message_type**: `location`
-   **message_text**: 장소명 (있을 경우)
-   **attachments**:

``` json
{
  "type": "location",
  "title": "Starbucks",
  "address": "서울 강남구 테헤란로 123",
  "latitude": 37.12345,
  "longitude": 127.12345
}
```

------------------------------------------------------------------------

## 7. 스티커(Sticker)

-   **message_type**: `sticker`
-   **message_text**: MESSAGE 타입일 때만 포함 (`text`)
-   **attachments**:

``` json
{
  "type": "sticker",
  "packageId": "11537",
  "stickerId": "52002738",
  "stickerResourceType": "ANIMATION",
  "keywords": ["cony","sally","hi"],
  "quotedMessageId": "optional"
}
```

### 주의사항

-   **스티커 이미지 직접 획득 불가**
-   **Sticker Arranging 미지원**
-   **stickerResourceType**: 앞으로 추가될 수 있음 → TEXT로 저장 권장
-   **keywords**: 최대 15개, 랜덤 샘플일 수 있음
-   **MESSAGE 타입** → `text` 필드 포함 가능

------------------------------------------------------------------------

# 인덱스(Index) 제안

-   자주 검색 시:
    -   `((attachments->>'stickerId'))`\
    -   `((attachments->>'packageId'))`
-   MESSAGE 타입 스티커 텍스트 → `message_text`에 Full-text 인덱스

------------------------------------------------------------------------

# 요약

-   모든 메시지는 `message_type` + `message_text` + `attachments(jsonb)`
    조합으로 저장
-   attachments는 타입별 JSON 스키마를 따름
-   앞으로의 확장성을 위해 ENUM보다 TEXT 사용 권장
