# Instagram 사용자 프로필 API 가이드

## 개요

사용자 프로필 API를 사용하면 Instagram 범위 ID(IGSID)를 통해 고객 프로필 정보를 가져올 수 있습니다. 이 정보로 비즈니스와 상호작용하는 사용자를 위한 개인화된 경험을 만들 수 있습니다.

## 사용자 동의

**⚠️ 중요: 사용자 프로필에 액세스하려면 사용자 동의가 필수입니다.**

### 동의가 설정되는 경우
- 사용자가 비즈니스에 메시지를 보낼 때
- 아이스 브레이커를 클릭할 때
- 고정 메뉴를 클릭할 때

### 동의가 설정되지 않는 경우
- 사용자가 게시물이나 댓글에 댓글을 남기지만 비즈니스에 메시지를 보내지 않은 경우
- 이 경우 **"사용자 프로필에 액세스하려면 사용자 동의가 필수입니다"** 오류 메시지가 발생

## 요구사항

### 필요한 권한
- `instagram_basic`
- `instagram_manage_messages`
- `pages_manage_metadata`
- `pages_read_engagement`
- `pages_show_list`

### 액세스 토큰
- 페이지에서 `MODERATE` 작업을 수행할 수 있는 사용자가 요청한 페이지 액세스 토큰

### 제한사항
- 고객이 비즈니스를 차단한 경우 고객의 정보를 볼 수 없음

## 사용자 프로필 필드

### 모든 Graph API 버전에서 제공되는 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `name` | 문자열 | 고객 이름 (이름을 설정하지 않은 경우 null일 수 있음) |
| `profile_pic` | URL | 고객 프로필 사진의 URL (프로필 사진을 설정하지 않은 경우 null일 수 있음). 이 URL은 며칠 이내로 만료됩니다. |

### Graph API v12.0 이상에서 제공되는 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `is_verified_user` | 부울 | 고객의 인증 상태 |
| `follower_count` | 정수 | 고객의 팔로워 수 |
| `is_user_follow_business` | 부울 | 고객이 비즈니스를 팔로우하는지 여부 |
| `is_business_follow_user` | 부울 | 비즈니스가 고객을 팔로우하는지 여부 |

### Graph API v14.0 이상에서 제공되는 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `username` | 문자열 | 고객 Instagram 계정의 사용자 이름 |

## API 사용 방법

고객의 프로필 정보를 가져오려면 고객의 Instagram 범위 ID 노드에 `GET` 요청을 보내고, 확인하려는 필드를 포함합니다.

### 요청 예시

```bash
curl -X GET "https://graph.facebook.com/v23.0/{instagram-scoped-user-id}?fields=name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user&access_token={page-access-token}"
```

### 응답 예시

```json
{
  "name": "Peter Chang",
  "username": "peter_chang_live",
  "profile_pic": "https://fbcdn-profile-...",
  "follower_count": 1234,
  "is_user_follow_business": false,
  "is_business_follow_user": true
}
```

## 실용적인 활용 사례

### 1. 개인화된 고객 응대

```bash
# 고객 프로필 정보 조회
curl -X GET "https://graph.facebook.com/v23.0/{IGSID}?fields=name,username,is_verified_user,follower_count,is_user_follow_business&access_token={PAGE_TOKEN}"
```

**활용 방법:**
- VIP 고객(인증된 사용자 또는 팔로워 수가 많은 사용자) 식별
- 팔로워 여부에 따른 차별화된 응답
- 개인화된 인사말 생성

### 2. CRM 시스템 연동

```bash
# 전체 프로필 정보 수집
curl -X GET "https://graph.facebook.com/v23.0/{IGSID}?fields=name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user&access_token={PAGE_TOKEN}"
```

**활용 방법:**
- 고객 데이터베이스에 프로필 정보 저장
- 팔로우 관계 추적
- 고객 세그멘테이션

### 3. 인플루언서 식별

```bash
# 인플루언서 여부 확인
curl -X GET "https://graph.facebook.com/v23.0/{IGSID}?fields=is_verified_user,follower_count,username&access_token={PAGE_TOKEN}"
```

**활용 방법:**
- 일정 팔로워 수 이상의 사용자 식별
- 인증된 계정 확인
- 협업 제안 대상 선별

## 오류 처리

### 일반적인 오류 상황

1. **동의 없음 오류**
   - 메시지: "사용자 프로필에 액세스하려면 사용자 동의가 필수입니다"
   - 해결: 사용자가 먼저 메시지를 보내도록 유도

2. **차단된 사용자**
   - 상황: 고객이 비즈니스를 차단한 경우
   - 결과: 프로필 정보 조회 불가

3. **만료된 프로필 사진 URL**
   - 상황: 며칠 후 프로필 사진 URL 만료
   - 해결: 정기적으로 프로필 정보 업데이트

## 개발 팁

### 효율적인 데이터 관리

```bash
# 필요한 필드만 요청하여 응답 시간 최적화
curl -X GET "https://graph.facebook.com/v23.0/{IGSID}?fields=name,is_user_follow_business&access_token={PAGE_TOKEN}"
```

### 배치 처리

```bash
# 여러 사용자의 프로필 정보를 한 번에 조회
curl -X GET "https://graph.facebook.com/v23.0/?ids={IGSID1},{IGSID2},{IGSID3}&fields=name,username,follower_count&access_token={PAGE_TOKEN}"
```

## 개발자 지원 리소스

- [Meta Status 도구](https://metastatus.com/): Meta 비즈니스 제품의 상태와 중단 확인
- [Meta 개발자 지원 도구](https://developers.facebook.com/support/): 버그 신고 및 지원 요청
- [Messenger 플랫폼 지원 리소스](https://developers.facebook.com/docs/messenger-platform/support-resources): Messenger 플랫폼 관련 상세 지원

## 주요 포인트

- **동의 필수**: 사용자가 먼저 메시지를 보내야 프로필 정보 접근 가능
- **필드 선택**: API 버전에 따라 사용 가능한 필드가 다름
- **URL 만료**: 프로필 사진 URL은 며칠 내 만료되므로 정기 업데이트 필요
- **개인화 활용**: 팔로우 관계, 인증 상태 등을 활용한 맞춤형 서비스 제공 가능