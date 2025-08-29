# Public Schema Documentation

### conversations


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| platform | text | NO | - | - |
| platform_conversation_id | text | NO | - | - |
| customer_id | text | NO | - | - |
| business_account_id | text | NO | - | - |
| status | text | YES | 'pending'::text | - |
| last_message_at | timestamp with time zone | YES | - | - |
| last_message_text | text | YES | - | - |
| last_message_type | text | YES | - | - |
| last_sender_id | text | YES | - | - |
| unread_count | integer | YES | 0 | - |
| message_count | integer | YES | 0 | - |
| platform_data | jsonb | YES | - | - |
| created_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |
| updated_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |
| customer_name | text | YES | - | - |
| customer_profile_pic | text | YES | - | - |
| customer_is_verified | boolean | YES | false | - |
| messaging_window_expires_at | timestamp with time zone | YES | - | 메시징 윈도우 만료 시간 (Instagram: 고객 메시지 수신 시점 + 24시간, LINE: NULL) |
| messaging_window_type | text | YES | 'human_agent'::text | 메시징 윈도우 타입: standard (24시간), NULL (LINE - 제한 없음) |
| translation_enabled | boolean | YES | false | - |
| translation_target_lang | character varying(10) | YES | NULL::character varying | - |


### instagram_user_profiles


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| igsid | text | NO | - | - |
| name | text | YES | - | - |
| username | text | YES | - | - |
| profile_pic | text | YES | - | - |
| profile_pic_updated_at | timestamp with time zone | YES | - | - |
| follower_count | integer | YES | 0 | - |
| is_verified_user | boolean | YES | false | - |
| is_user_follow_business | boolean | YES | false | - |
| is_business_follow_user | boolean | YES | false | - |
| has_user_consent | boolean | YES | true | - |
| consent_granted_at | timestamp with time zone | YES | - | - |
| raw_profile_data | jsonb | YES | - | - |
| created_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |
| updated_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |
| last_fetched_at | timestamp with time zone | YES | - | - |
| fetch_error | text | YES | - | - |
| cache_expires_at | timestamp with time zone | YES | - | - |
| fetch_count | integer | YES | 0 | - |
| first_message_at | timestamp with time zone | YES | - | - |
| last_message_at | timestamp with time zone | YES | - | - |
| total_messages | integer | YES | 0 | - |
| is_active | boolean | YES | true | - |
| notes | text | YES | - | - |


### line_sent_messages


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| user_id | text | YES | - | - |
| group_id | text | YES | - | - |
| room_id | text | YES | - | - |
| reply_token | text | YES | - | - |
| message_type | text | NO | - | - |
| message_text | text | YES | - | - |
| attachments | jsonb | YES | - | - |
| template_type | text | YES | - | - |
| template_data | jsonb | YES | - | - |
| quick_reply | jsonb | YES | - | - |
| request_data | jsonb | NO | - | - |
| response_data | jsonb | YES | - | - |
| status | text | YES | 'pending'::text | - |
| error_message | text | YES | - | - |
| retry_count | integer | YES | 0 | - |
| sent_at | timestamp with time zone | YES | now() | - |
| created_at | timestamp with time zone | YES | now() | - |


### line_user_profiles


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| user_id | text | NO | - | - |
| display_name | text | YES | - | - |
| picture_url | text | YES | - | - |
| language | text | YES | - | - |
| cache_expires_at | timestamp with time zone | YES | (now() + '24:00:00'::interval) | - |
| last_fetched_at | timestamp with time zone | YES | now() | - |
| created_at | timestamp with time zone | YES | now() | - |
| updated_at | timestamp with time zone | YES | now() | - |


### line_webhooks


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| webhook_type | text | NO | - | - |
| raw_data | jsonb | NO | - | - |
| user_id | text | YES | - | - |
| group_id | text | YES | - | - |
| room_id | text | YES | - | - |
| message_id | text | YES | - | - |
| message_type | text | YES | - | - |
| message_text | text | YES | - | - |
| attachments | jsonb | YES | - | - |
| sticker_package_id | text | YES | - | - |
| sticker_id | text | YES | - | - |
| location_title | text | YES | - | - |
| location_address | text | YES | - | - |
| location_latitude | numeric | YES | - | - |
| location_longitude | numeric | YES | - | - |
| reply_token | text | YES | - | - |
| postback_data | text | YES | - | - |
| postback_params | jsonb | YES | - | - |
| timestamp | bigint | YES | - | - |
| created_at | timestamp with time zone | YES | now() | - |
| processed | boolean | YES | false | - |
| processed_at | timestamp with time zone | YES | - | - |


### messages
> 모든 플랫폼의 메시지를 통합 관리하는 테이블

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| conversation_id | uuid | NO | - | FK → conversations.id |
| platform | text | NO | - | 메시지 출처 플랫폼 |
| sender_type | text | NO | - | 발신자 유형: customer(고객), business(비즈니스), system(시스템) |
| sender_id | text | NO | - | 발신자 플랫폼 ID (Instagram: 실제ID, LINE: 실제ID 또는 line_business_account) |
| recipient_id | text | NO | - | 수신자 플랫폼 ID |
| message_text | text | YES | - | 메시지 본문 |
| message_type | text | YES | - | 메시지 유형 |
| attachments | jsonb | YES | - | 첨부파일, 미디어, 위치, 스티커 등 JSONB 데이터 |
| original_message_id | text | YES | - | 플랫폼별 원본 메시지 ID (중복 방지용) |
| message_timestamp | timestamp with time zone | NO | - | 플랫폼에서 메시지가 발생한 시각 |
| created_at | timestamp with time zone | YES | now() | DB에 저장된 시각 |


### instagram_webhooks


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| webhook_type | text | NO | - | - |
| raw_data | jsonb | NO | - | - |
| created_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |
| processed | boolean | YES | false | - |
| entry_id | text | YES | - | - |
| entry_time | bigint | YES | - | - |
| sender_id | text | YES | - | - |
| recipient_id | text | YES | - | - |
| message_timestamp | bigint | YES | - | - |
| message_id | text | YES | - | - |
| message_text | text | YES | - | - |
| is_deleted | boolean | YES | false | - |
| is_echo | boolean | YES | false | - |
| is_unsupported | boolean | YES | false | - |
| attachments | jsonb | YES | - | - |
| attachment_types | text[] | YES | - | - |
| reply_to_message_id | text | YES | - | - |
| reply_to_story_id | text | YES | - | - |
| reply_to_story_url | text | YES | - | - |
| quick_reply_payload | text | YES | - | - |
| reaction_action | text | YES | - | - |
| reaction_type | text | YES | - | - |
| reaction_emoji | text | YES | - | - |
| reaction_target_mid | text | YES | - | - |
| postback_title | text | YES | - | - |
| postback_payload | text | YES | - | - |
| postback_mid | text | YES | - | - |
| referral_ref | text | YES | - | - |
| referral_source | text | YES | - | - |
| referral_type | text | YES | - | - |
| referral_product_id | text | YES | - | - |
| referral_ad_id | text | YES | - | - |
| referral_ads_context | jsonb | YES | - | - |
| read_message_id | text | YES | - | - |


### translations
> 메시지 번역 저장 및 캐싱 테이블

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| message_id | uuid | YES | - | 연관된 메시지 ID (선택적) |
| original_text | text | NO | - | 원본 텍스트 |
| translated_text | text | NO | - | 번역된 텍스트 |
| source_lang | character varying(10) | YES | - | 원본 언어 코드 (NULL = 자동 감지) |
| target_lang | character varying(10) | NO | - | 대상 언어 코드 |
| translation_provider | character varying(20) | YES | 'deepl'::character varying | 번역 제공자 (deepl, google, etc) |
| response_time_ms | integer | YES | - | API 응답 시간 (밀리초) |
| character_count | integer | YES | - | 문자 수 (향후 사용량 추적용) |
| created_at | timestamp with time zone | YES | now() | - |
| is_deleted | boolean | YES | false | - |
| deleted_at | timestamp with time zone | YES | - | - |


### user_profiles


**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | - |
| platform | text | NO | - | - |
| platform_user_id | text | NO | - | - |
| display_name | text | YES | - | - |
| username | text | YES | - | - |
| profile_pic | text | YES | - | - |
| platform_data | jsonb | YES | - | - |
| created_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |
| updated_at | timestamp with time zone | YES | timezone('utc'::text, now()) | - |

## Primary Keys

- **conversations**: (id)
- **instagram_user_profiles**: (id)
- **instagram_webhooks**: (id)
- **line_sent_messages**: (id)
- **line_user_profiles**: (id)
- **line_webhooks**: (id)
- **messages**: (id)
- **translations**: (id)
- **user_profiles**: (id)
## Foreign Keys

- **messages_conversation_id_fkey**: messages (conversation_id) → conversations (id)
- **translations_message_id_fkey**: translations (message_id) → messages (id)
## Check Constraints

- **messages.messages_platform_check**: `CHECK ((platform = ANY (ARRAY['instagram'::text, 'line'::text, 'kakao'::text, 'whatsapp'::text])))`
- **messages.messages_sender_type_check**: `CHECK ((sender_type = ANY (ARRAY['customer'::text, 'business'::text, 'system'::text])))`
- **messages.messages_message_type_check**: `CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'audio'::text, 'file'::text, 'sticker'::text, 'location'::text, 'template'::text, 'postback'::text, 'quick_reply'::text])))`
## Indexes

- **conversations_platform_platform_conversation_id_key**: UNIQUE btree on conversations (CREATE UNIQUE INDEX conversations_platform_platform_conversation_id_key ON public.conversations USING btree (platform, platform_conversation_id))
- **idx_conversations_lookup**: btree on conversations (CREATE INDEX idx_conversations_lookup ON public.conversations USING btree (platform, platform_conversation_id))
- **idx_conversations_customer**: btree on conversations (CREATE INDEX idx_conversations_customer ON public.conversations USING btree (platform, customer_id))
- **idx_conv_platform_status_time**: btree on conversations (CREATE INDEX idx_conv_platform_status_time ON public.conversations USING btree (platform, status, last_message_at DESC) WHERE (last_message_at IS NOT NULL))
- **idx_conv_active**: btree on conversations (CREATE INDEX idx_conv_active ON public.conversations USING btree (platform, last_message_at DESC) WHERE (status = ANY (ARRAY['pending'::text, 'in_progress'::text])))
- **idx_conv_customer_lookup**: btree on conversations (CREATE INDEX idx_conv_customer_lookup ON public.conversations USING btree (platform, customer_id, last_message_at DESC))
- **idx_conv_message_count**: btree on conversations (CREATE INDEX idx_conv_message_count ON public.conversations USING btree (platform, message_count DESC) WHERE (message_count > 0))
- **idx_conversations_platform_status_unread**: btree on conversations (CREATE INDEX idx_conversations_platform_status_unread ON public.conversations USING btree (platform, status, unread_count DESC))
- **idx_conversations_platform_updated**: btree on conversations (CREATE INDEX idx_conversations_platform_updated ON public.conversations USING btree (platform, updated_at DESC))
- **idx_conversations_messaging_window_expires**: btree on conversations (CREATE INDEX idx_conversations_messaging_window_expires ON public.conversations USING btree (platform, messaging_window_expires_at) WHERE (messaging_window_expires_at IS NOT NULL))
- **idx_conversations_translation**: btree on conversations (CREATE INDEX idx_conversations_translation ON public.conversations USING btree (translation_enabled, translation_target_lang) WHERE (translation_enabled = true))
- **idx_conv_customer_cache**: btree on conversations (CREATE INDEX idx_conv_customer_cache ON public.conversations USING btree (platform, customer_name, customer_profile_pic) WHERE (customer_name IS NOT NULL))
- **instagram_user_profiles_igsid_key**: UNIQUE btree on instagram_user_profiles (CREATE UNIQUE INDEX instagram_user_profiles_igsid_key ON public.instagram_user_profiles USING btree (igsid))
- **idx_user_profiles_igsid**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_igsid ON public.instagram_user_profiles USING btree (igsid))
- **idx_user_profiles_username**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_username ON public.instagram_user_profiles USING btree (username))
- **idx_user_profiles_cache_expires**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_cache_expires ON public.instagram_user_profiles USING btree (cache_expires_at))
- **idx_user_profiles_is_verified**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_is_verified ON public.instagram_user_profiles USING btree (is_verified_user))
- **idx_user_profiles_follower_count**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_follower_count ON public.instagram_user_profiles USING btree (follower_count DESC))
- **idx_user_profiles_last_message**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_last_message ON public.instagram_user_profiles USING btree (last_message_at DESC))
- **idx_user_profiles_is_active**: btree on instagram_user_profiles (CREATE INDEX idx_user_profiles_is_active ON public.instagram_user_profiles USING btree (is_active))
- **idx_line_sent_messages_user_id**: btree on line_sent_messages (CREATE INDEX idx_line_sent_messages_user_id ON public.line_sent_messages USING btree (user_id))
- **idx_line_sent_messages_status**: btree on line_sent_messages (CREATE INDEX idx_line_sent_messages_status ON public.line_sent_messages USING btree (status))
- **idx_line_sent_messages_sent_at**: btree on line_sent_messages (CREATE INDEX idx_line_sent_messages_sent_at ON public.line_sent_messages USING btree (sent_at DESC))
- **idx_line_sent_messages_message_text**: gin on line_sent_messages (CREATE INDEX idx_line_sent_messages_message_text ON public.line_sent_messages USING gin (to_tsvector('simple'::regconfig, COALESCE(message_text, ''::text))))
- **line_user_profiles_user_id_key**: UNIQUE btree on line_user_profiles (CREATE UNIQUE INDEX line_user_profiles_user_id_key ON public.line_user_profiles USING btree (user_id))
- **idx_line_user_profiles_user_id**: btree on line_user_profiles (CREATE INDEX idx_line_user_profiles_user_id ON public.line_user_profiles USING btree (user_id))
- **idx_line_user_profiles_cache_expires**: btree on line_user_profiles (CREATE INDEX idx_line_user_profiles_cache_expires ON public.line_user_profiles USING btree (cache_expires_at))
- **idx_line_webhooks_user_id**: btree on line_webhooks (CREATE INDEX idx_line_webhooks_user_id ON public.line_webhooks USING btree (user_id))
- **idx_line_webhooks_message_id**: btree on line_webhooks (CREATE INDEX idx_line_webhooks_message_id ON public.line_webhooks USING btree (message_id))
- **idx_line_webhooks_webhook_type**: btree on line_webhooks (CREATE INDEX idx_line_webhooks_webhook_type ON public.line_webhooks USING btree (webhook_type))
- **idx_line_webhooks_timestamp**: btree on line_webhooks (CREATE INDEX idx_line_webhooks_timestamp ON public.line_webhooks USING btree ("timestamp" DESC))
- **idx_line_webhooks_created_at**: btree on line_webhooks (CREATE INDEX idx_line_webhooks_created_at ON public.line_webhooks USING btree (created_at DESC))
- **idx_line_webhooks_processed**: btree on line_webhooks (CREATE INDEX idx_line_webhooks_processed ON public.line_webhooks USING btree (processed))
- **idx_line_webhooks_message_text**: gin on line_webhooks (CREATE INDEX idx_line_webhooks_message_text ON public.line_webhooks USING gin (to_tsvector('simple'::regconfig, COALESCE(message_text, ''::text))))
- **messages_platform_original_message_id_key**: UNIQUE btree on messages (CREATE UNIQUE INDEX messages_platform_original_message_id_key ON public.messages USING btree (platform, original_message_id))
- **idx_messages_conversation_time**: btree on messages (CREATE INDEX idx_messages_conversation_time ON public.messages USING btree (conversation_id, message_timestamp DESC))
- **idx_messages_platform_conversation**: btree on messages (CREATE INDEX idx_messages_platform_conversation ON public.messages USING btree (platform, conversation_id))
- **idx_messages_original_id**: btree on messages (CREATE INDEX idx_messages_original_id ON public.messages USING btree (original_message_id) WHERE (original_message_id IS NOT NULL))
- **idx_messages_sender_type_customer**: btree on messages (CREATE INDEX idx_messages_sender_type_customer ON public.messages USING btree (sender_type) WHERE (sender_type = 'customer'::text))
- **idx_messages_created_at**: btree on messages (CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC))
- **idx_messages_type**: btree on messages (CREATE INDEX idx_messages_type ON public.messages USING btree (message_type))
- **idx_webhooks_sender_id**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_sender_id ON public.instagram_webhooks USING btree (sender_id))
- **idx_webhooks_recipient_id**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_recipient_id ON public.instagram_webhooks USING btree (recipient_id))
- **idx_webhooks_message_timestamp**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_message_timestamp ON public.instagram_webhooks USING btree (message_timestamp DESC))
- **idx_webhooks_webhook_type**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_webhook_type ON public.instagram_webhooks USING btree (webhook_type))
- **idx_webhooks_created_at**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_created_at ON public.instagram_webhooks USING btree (created_at DESC))
- **idx_webhooks_processed**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_processed ON public.instagram_webhooks USING btree (processed))
- **idx_webhooks_message_id**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_message_id ON public.instagram_webhooks USING btree (message_id))
- **idx_webhooks_entry_id**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_entry_id ON public.instagram_webhooks USING btree (entry_id))
- **idx_webhooks_raw_data**: gin on instagram_webhooks (CREATE INDEX idx_webhooks_raw_data ON public.instagram_webhooks USING gin (raw_data))
- **idx_webhooks_attachments**: gin on instagram_webhooks (CREATE INDEX idx_webhooks_attachments ON public.instagram_webhooks USING gin (attachments))
- **idx_webhooks_attachment_types**: gin on instagram_webhooks (CREATE INDEX idx_webhooks_attachment_types ON public.instagram_webhooks USING gin (attachment_types))
- **idx_webhooks_message_text**: gin on instagram_webhooks (CREATE INDEX idx_webhooks_message_text ON public.instagram_webhooks USING gin (to_tsvector('simple'::regconfig, COALESCE(message_text, ''::text))))
- **idx_webhooks_conversation**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_conversation ON public.instagram_webhooks USING btree (sender_id, recipient_id, message_timestamp DESC))
- **idx_webhooks_unprocessed**: btree on instagram_webhooks (CREATE INDEX idx_webhooks_unprocessed ON public.instagram_webhooks USING btree (processed, created_at) WHERE (processed = false))
- **idx_instagram_webhooks_participants**: btree on instagram_webhooks (CREATE INDEX idx_instagram_webhooks_participants ON public.instagram_webhooks USING btree (sender_id, recipient_id))
- **idx_translations_message**: btree on translations (CREATE INDEX idx_translations_message ON public.translations USING btree (message_id) WHERE (message_id IS NOT NULL))
- **idx_translations_created**: btree on translations (CREATE INDEX idx_translations_created ON public.translations USING btree (created_at DESC))
- **idx_translations_langs**: btree on translations (CREATE INDEX idx_translations_langs ON public.translations USING btree (source_lang, target_lang))
- **unique_translation_per_message**: UNIQUE btree on translations (CREATE UNIQUE INDEX unique_translation_per_message ON public.translations USING btree (message_id, target_lang, translation_provider))
- **idx_translations_message_cache**: btree on translations (CREATE INDEX idx_translations_message_cache ON public.translations USING btree (message_id, target_lang, translation_provider) WHERE (message_id IS NOT NULL))
- **idx_translations_active**: btree on translations (CREATE INDEX idx_translations_active ON public.translations USING btree (message_id, target_lang, is_deleted) WHERE (is_deleted = false))
- **user_profiles_platform_platform_user_id_key**: UNIQUE btree on user_profiles (CREATE UNIQUE INDEX user_profiles_platform_platform_user_id_key ON public.user_profiles USING btree (platform, platform_user_id))
- **idx_user_profiles_lookup**: btree on user_profiles (CREATE INDEX idx_user_profiles_lookup ON public.user_profiles USING btree (platform, platform_user_id))
- **idx_user_profiles_platform**: btree on user_profiles (CREATE INDEX idx_user_profiles_platform ON public.user_profiles USING btree (platform))
- **idx_profiles_platform_user**: btree on user_profiles (CREATE INDEX idx_profiles_platform_user ON public.user_profiles USING btree (platform, platform_user_id))
- **idx_profiles_display**: btree on user_profiles (CREATE INDEX idx_profiles_display ON public.user_profiles USING btree (display_name, username))
## Triggers

### sync_line_url_update_trigger on line_webhooks\n- **Event**: AFTER\n- **Timing**: UPDATE\n- **Function**: update_messages_line_url\n
### sync_instagram_to_messages_trigger on instagram_webhooks\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_instagram_to_messages\n
### sync_line_webhooks_to_messages_trigger on line_webhooks\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_line_to_messages\n
### sync_line_sent_to_messages_trigger on line_sent_messages\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_line_to_messages\n
### update_user_profile_updated_at_trigger on instagram_user_profiles\n- **Event**: BEFORE\n- **Timing**: UPDATE\n- **Function**: update_user_profile_updated_at\n
### sync_instagram_profiles_to_unified on instagram_user_profiles\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_instagram_profile_to_unified\n
### sync_profile_cache on user_profiles\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_profile_cache_to_conversations\n
### update_line_user_profile_updated_at_trigger on line_user_profiles\n- **Event**: BEFORE\n- **Timing**: UPDATE\n- **Function**: update_line_user_profile_updated_at\n
### sync_line_profile_trigger on line_user_profiles\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_line_profile_to_unified\n
### sync_line_webhooks_to_conversations on line_webhooks\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_line_to_unified_conversations\n
### sync_line_sent_to_conversations on line_sent_messages\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_line_to_unified_conversations\n
### sync_instagram_all_in_one_trigger on instagram_webhooks\n- **Event**: AFTER\n- **Timing**: INSERT\n- **Function**: sync_instagram_all_in_one\n
## RLS Policies

### instagram_user_profiles
**RLS Enabled**: Yes

- **Allow all operations on user profiles** (ALL): PERMISSIVE\n  - Using: `true`\n  - Check: `true`

### line_sent_messages
**RLS Enabled**: Yes

- **Allow anonymous insert sent** (INSERT): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
- **Allow authenticated select sent** (SELECT): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
- **Allow authenticated update sent** (UPDATE): PERMISSIVE\n  - Using: `true`\n  - Check: `true`

### line_webhooks
**RLS Enabled**: Yes

- **Allow anonymous insert webhooks** (INSERT): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
- **Allow authenticated select webhooks** (SELECT): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
- **Allow authenticated update webhooks** (UPDATE): PERMISSIVE\n  - Using: `true`\n  - Check: `true`

### messages
**RLS Enabled**: Yes

- **Allow all operations on messages** (ALL): PERMISSIVE\n  - Using: `true`\n  - Check: `true`

### instagram_webhooks
**RLS Enabled**: Yes

- **Allow anonymous insert** (INSERT): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
- **Allow authenticated select** (SELECT): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
- **Allow authenticated update** (UPDATE): PERMISSIVE\n  - Using: `true`\n  - Check: `true`

### translations
**RLS Enabled**: Yes

- **Allow all operations on translations** (ALL): PERMISSIVE\n  - Using: `true`\n  - Check: `true`
## Views

### active_messaging_windows
```sql
 SELECT platform,
    count(*) AS total_conversations,
    count(
        CASE
            WHEN (messaging_window_expires_at > now()) THEN 1
            ELSE NULL::integer
        END) AS active_windows,
    count(
        CASE
            WHEN (messaging_window_expires_at <= now()) THEN 1
            ELSE NULL::integer
        END) AS expired_windows,
    count(
        CASE
            WHEN (messaging_window_expires_at IS NULL) THEN 1
            ELSE NULL::integer
        END) AS no_window
   FROM conversations
  GROUP BY platform;
```

## Functions

### sync_instagram_to_messages
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_instagram_to_messages()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conversation_id uuid;
  v_sender_type text;
  v_sender_id text;
  v_recipient_id text;
  v_message_type text;
BEGIN
  -- webhook_type이 message가 아니면 처리하지 않음
  IF NEW.webhook_type != 'message' THEN
    RETURN NEW;
  END IF;

  -- conversation_id 찾기
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE platform = 'instagram'
    AND (
      (customer_id = NEW.sender_id AND business_account_id = NEW.recipient_id) OR
      (customer_id = NEW.recipient_id AND business_account_id = NEW.sender_id)
    )
  LIMIT 1;

  -- conversation이 없으면 스킵 (sync_instagram_all_in_one이 먼저 실행되어야 함)
  IF v_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- sender_type 결정 (is_echo 기반)
  IF NEW.is_echo = true THEN
    v_sender_type := 'business';
    v_sender_id := NEW.sender_id;      -- 비즈니스 실제 ID
    v_recipient_id := NEW.recipient_id; -- 고객 ID
  ELSE
    v_sender_type := 'customer';
    v_sender_id := NEW.sender_id;      -- 고객 ID
    v_recipient_id := NEW.recipient_id; -- 비즈니스 실제 ID
  END IF;

  -- message_type 결정
  v_message_type := CASE
    WHEN NEW.attachments IS NOT NULL THEN 
      CASE 
        WHEN NEW.attachments->0->>'type' = 'image' THEN 'image'
        WHEN NEW.attachments->0->>'type' = 'video' THEN 'video'
        WHEN NEW.attachments->0->>'type' = 'audio' THEN 'audio'
        WHEN NEW.attachments->0->>'type' = 'file' THEN 'file'
        ELSE 'file'
      END
    WHEN NEW.quick_reply_payload IS NOT NULL THEN 'quick_reply'
    WHEN NEW.postback_payload IS NOT NULL THEN 'postback'
    ELSE 'text'
  END;

  -- Messages 테이블에 삽입
  INSERT INTO messages (
    conversation_id,
    platform,
    sender_type,
    sender_id,
    recipient_id,
    message_text,
    message_type,
    attachments,
    original_message_id,
    message_timestamp,
    created_at
  ) VALUES (
    v_conversation_id,
    'instagram',
    v_sender_type,
    v_sender_id,
    v_recipient_id,
    NEW.message_text,
    v_message_type,
    NEW.attachments,
    NEW.message_id,
    to_timestamp(NEW.message_timestamp / 1000.0),
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (platform, original_message_id) 
  DO NOTHING; -- 중복 메시지 무시

  RETURN NEW;
END;
$function$

```

### sync_line_to_messages
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_line_to_messages()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conversation_id uuid;
  v_sender_type text;
  v_sender_id text;
  v_recipient_id text;
  v_message_type text;
  v_message_text text;
  v_original_id text;
  v_timestamp bigint;
  v_attachments jsonb;
BEGIN
  -- conversation_id 찾기
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE platform = 'line'
    AND platform_conversation_id = COALESCE(NEW.user_id, NEW.group_id, NEW.room_id)
  LIMIT 1;

  -- conversation이 없으면 스킵
  IF v_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 테이블별 처리
  IF TG_TABLE_NAME = 'line_webhooks' THEN
    -- 고객이 보낸 메시지
    IF NEW.webhook_type != 'message' THEN
      RETURN NEW;
    END IF;

    v_sender_type := 'customer';
    v_sender_id := COALESCE(NEW.user_id, NEW.group_id, NEW.room_id);
    v_recipient_id := 'line_business_account';
    v_message_text := NEW.message_text;
    v_original_id := NEW.message_id;
    v_timestamp := NEW.timestamp;
    
    -- message_type 및 attachments 결정
    v_message_type := CASE
      WHEN NEW.message_type = 'text' THEN 'text'
      WHEN NEW.message_type = 'image' THEN 'image'
      WHEN NEW.message_type = 'video' THEN 'video'
      WHEN NEW.message_type = 'audio' THEN 'audio'
      WHEN NEW.message_type = 'file' THEN 'file'
      WHEN NEW.message_type = 'sticker' THEN 'sticker'
      WHEN NEW.message_type = 'location' THEN 'location'
      ELSE NEW.message_type
    END;

    -- attachments 구성
    v_attachments := CASE
      WHEN NEW.message_type = 'sticker' THEN 
        jsonb_build_object(
          'type', 'sticker',
          'packageId', NEW.sticker_package_id,
          'stickerId', NEW.sticker_id
        )
      WHEN NEW.message_type = 'location' THEN
        jsonb_build_object(
          'type', 'location',
          'title', NEW.location_title,
          'address', NEW.location_address,
          'latitude', NEW.location_latitude,
          'longitude', NEW.location_longitude
        )
      ELSE NEW.attachments
    END;

  ELSIF TG_TABLE_NAME = 'line_sent_messages' THEN
    -- 비즈니스가 보낸 메시지
    IF NEW.status != 'sent' THEN
      RETURN NEW; -- sent 상태만 처리
    END IF;

    v_sender_type := 'business';
    v_sender_id := 'line_business_account';
    v_recipient_id := COALESCE(NEW.user_id, NEW.group_id, NEW.room_id);
    v_message_text := NEW.message_text;
    v_original_id := NEW.id::text; -- UUID를 text로
    v_timestamp := EXTRACT(epoch FROM NEW.sent_at)::bigint * 1000; -- milliseconds
    
    -- message_type 결정
    v_message_type := CASE
      WHEN NEW.message_type = 'text' THEN 'text'
      WHEN NEW.template_type IS NOT NULL THEN 'template'
      ELSE COALESCE(NEW.message_type, 'text')
    END;

    -- attachments 구성
    v_attachments := CASE
      WHEN NEW.template_data IS NOT NULL THEN NEW.template_data
      WHEN NEW.quick_reply IS NOT NULL THEN NEW.quick_reply
      ELSE NEW.attachments
    END;
  END IF;

  -- Messages 테이블에 삽입
  INSERT INTO messages (
    conversation_id,
    platform,
    sender_type,
    sender_id,
    recipient_id,
    message_text,
    message_type,
    attachments,
    original_message_id,
    message_timestamp,
    created_at
  ) VALUES (
    v_conversation_id,
    'line',
    v_sender_type,
    v_sender_id,
    v_recipient_id,
    v_message_text,
    v_message_type,
    v_attachments,
    v_original_id,
    to_timestamp(v_timestamp / 1000.0),
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (platform, original_message_id) 
  DO NOTHING; -- 중복 메시지 무시

  RETURN NEW;
END;
$function$

```

### update_user_profile_updated_at
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$function$

```

### profile_needs_refresh
- **Returns**: boolean
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.profile_needs_refresh(profile_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT cache_expires_at, profile_pic_updated_at
    INTO profile_record
    FROM instagram_user_profiles
    WHERE id = profile_id;
    
    -- Check if cache expired (24 hours by default)
    IF profile_record.cache_expires_at IS NULL OR 
       profile_record.cache_expires_at < NOW() THEN
        RETURN TRUE;
    END IF;
    
    -- Check if profile pic is older than 3 days
    IF profile_record.profile_pic_updated_at IS NULL OR
       profile_record.profile_pic_updated_at < NOW() - INTERVAL '3 days' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$function$

```

### get_or_create_user_profile
- **Returns**: uuid
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile(user_igsid text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    profile_id UUID;
BEGIN
    -- Try to get existing profile
    SELECT id INTO profile_id
    FROM instagram_user_profiles
    WHERE igsid = user_igsid;
    
    -- If not found, create new profile
    IF profile_id IS NULL THEN
        INSERT INTO instagram_user_profiles (igsid)
        VALUES (user_igsid)
        RETURNING id INTO profile_id;
    END IF;
    
    RETURN profile_id;
END;
$function$

```

### update_conversation_updated_at
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    -- status 변경 시 status_updated_at도 업데이트
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = TIMEZONE('utc', NOW());
    END IF;
    RETURN NEW;
END;
$function$

```

### sync_instagram_profile_to_unified
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_instagram_profile_to_unified()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO user_profiles (
    platform,
    platform_user_id,
    display_name,
    username,
    profile_pic,
    platform_data,
    created_at,
    updated_at
  ) VALUES (
    'instagram',
    NEW.igsid,
    COALESCE(NEW.name, NEW.username),
    NEW.username,
    NEW.profile_pic,
    jsonb_build_object(
      'follower_count', NEW.follower_count,
      'is_user_follow_business', NEW.is_user_follow_business,
      'is_business_follow_user', NEW.is_business_follow_user,
      'has_user_consent', NEW.has_user_consent,
      'is_verified_user', NEW.is_verified_user  -- 원본 데이터는 platform_data에 보존
    ),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (platform, platform_user_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    username = EXCLUDED.username,
    profile_pic = EXCLUDED.profile_pic,
    platform_data = EXCLUDED.platform_data,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$

```

### sync_profile_cache_to_conversations
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_profile_cache_to_conversations()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update cached profile fields in conversations table
  UPDATE conversations
  SET 
    customer_name = NEW.display_name,
    customer_profile_pic = NEW.profile_pic,
    -- customer_is_verified 제거 (컬럼이 있다면 NULL로 설정)
    customer_is_verified = CASE 
      WHEN NEW.platform = 'instagram' THEN 
        (NEW.platform_data->>'is_verified_user')::boolean
      ELSE false
    END,
    updated_at = NOW()
  WHERE platform = NEW.platform 
    AND customer_id = NEW.platform_user_id;
  
  RETURN NEW;
END;
$function$

```

### update_messages_line_url
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.update_messages_line_url()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- originalUrl이 새로 추가된 경우만 처리
  -- (이전에는 NULL이었는데 이제 값이 있는 경우)
  IF (NEW.attachments->>'originalUrl' IS NOT NULL 
      AND (OLD.attachments->>'originalUrl' IS NULL 
           OR OLD.attachments->>'originalUrl' = '')) THEN
    
    -- messages 테이블의 attachments 업데이트
    UPDATE messages
    SET 
      attachments = NEW.attachments,
      updated_at = NOW()
    WHERE platform = 'line' 
      AND original_message_id = NEW.message_id::text;
    
    -- 디버깅용 로그
    RAISE NOTICE 'Updated LINE media URL for message_id: %, URL: %', 
      NEW.message_id, 
      NEW.attachments->>'originalUrl';
  END IF;
  
  RETURN NEW;
END;
$function$

```

### get_conversation_status_counts
- **Returns**: TABLE(active_count bigint, pending_count bigint, in_progress_count bigint, completed_count bigint, total_count bigint)
- **Language**: plpgsql
- **Volatility**: STABLE

```sql
CREATE OR REPLACE FUNCTION public.get_conversation_status_counts(p_platform text DEFAULT 'instagram'::text)
 RETURNS TABLE(active_count bigint, pending_count bigint, in_progress_count bigint, completed_count bigint, total_count bigint)
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as active_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) as total_count
  FROM conversations
  WHERE platform = p_platform;
END;
$function$

```

### sync_line_profile_to_unified
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_line_profile_to_unified()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO user_profiles (
    platform,
    platform_user_id,
    display_name,
    username,
    profile_pic,
    platform_data,
    created_at,
    updated_at
  )
  VALUES (
    'line',
    NEW.user_id,
    NEW.display_name,
    NULL,  -- LINE은 username 개념 없음
    NEW.picture_url,
    jsonb_build_object('language', NEW.language),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (platform, platform_user_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    profile_pic = EXCLUDED.profile_pic,
    platform_data = EXCLUDED.platform_data,
    updated_at = NOW();
    
  RETURN NEW;
END;
$function$

```

### update_line_user_profile_updated_at
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.update_line_user_profile_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

```

### line_profile_needs_refresh
- **Returns**: boolean
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.line_profile_needs_refresh(p_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_cache_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT cache_expires_at INTO v_cache_expires
  FROM line_user_profiles
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN true;  -- 프로필 없으면 새로 가져와야 함
  END IF;
  
  RETURN v_cache_expires < NOW();  -- 캐시 만료 확인
END;
$function$

```

### check_messaging_window_status
- **Returns**: TABLE(can_send boolean, expires_at timestamp with time zone, remaining_hours numeric, status text)
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.check_messaging_window_status(conv_id uuid)
 RETURNS TABLE(can_send boolean, expires_at timestamp with time zone, remaining_hours numeric, status text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      -- LINE은 항상 전송 가능
      WHEN c.platform = 'line' THEN TRUE
      -- Instagram은 윈도우가 있고 만료되지 않은 경우만
      WHEN c.platform = 'instagram' 
        AND c.messaging_window_expires_at IS NOT NULL
        AND c.messaging_window_expires_at > NOW() 
      THEN TRUE
      ELSE FALSE
    END as can_send,
    c.messaging_window_expires_at as expires_at,
    EXTRACT(EPOCH FROM (c.messaging_window_expires_at - NOW())) / 3600 as remaining_hours,
    CASE 
      WHEN c.platform = 'line' THEN 'no_restriction'
      WHEN c.messaging_window_expires_at IS NULL THEN 'no_window'
      WHEN c.messaging_window_expires_at > NOW() THEN 'active'
      ELSE 'expired'
    END as status
  FROM conversations c
  WHERE c.id = conv_id;
END;
$function$

```

### sync_instagram_all_in_one
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_instagram_all_in_one()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conversation_id TEXT;
  v_customer_id TEXT;
  v_business_id TEXT;
  v_is_customer_message BOOLEAN;
  v_participant_1 TEXT;
  v_participant_2 TEXT;
  v_customer_name TEXT;
  v_customer_profile_pic TEXT;
  v_customer_is_verified BOOLEAN;
BEGIN
  -- webhook_type이 message가 아니면 처리하지 않음
  IF NEW.webhook_type != 'message' THEN
    RETURN NEW;
  END IF;

  -- 고객과 비즈니스 ID 판별
  IF NEW.is_echo = true THEN
    v_customer_id := NEW.recipient_id;
    v_business_id := NEW.sender_id;
    v_is_customer_message := false;
  ELSE
    v_customer_id := NEW.sender_id;
    v_business_id := NEW.recipient_id;
    v_is_customer_message := true;
  END IF;

  -- 대화방 ID 생성
  IF v_customer_id < v_business_id THEN
    v_conversation_id := v_customer_id || '_' || v_business_id;
    v_participant_1 := v_customer_id;
    v_participant_2 := v_business_id;
  ELSE
    v_conversation_id := v_business_id || '_' || v_customer_id;
    v_participant_1 := v_business_id;
    v_participant_2 := v_customer_id;
  END IF;

  -- 고객 프로필 정보 조회
  SELECT 
    name,
    profile_pic,
    is_verified_user
  INTO 
    v_customer_name,
    v_customer_profile_pic,
    v_customer_is_verified
  FROM instagram_user_profiles
  WHERE igsid = v_customer_id
  LIMIT 1;

  -- conversations 테이블 업데이트
  INSERT INTO conversations (
    platform,
    platform_conversation_id,
    customer_id,
    business_account_id,
    status,
    last_message_at,
    last_message_text,
    last_message_type,
    last_sender_id,
    message_count,
    unread_count,
    customer_name,
    customer_profile_pic,
    customer_is_verified,
    messaging_window_expires_at,
    messaging_window_type,
    platform_data,
    created_at,
    updated_at
  ) VALUES (
    'instagram',
    v_conversation_id,
    v_customer_id,
    v_business_id,
    CASE WHEN v_is_customer_message THEN 'in_progress' ELSE 'pending' END,
    to_timestamp(NEW.message_timestamp / 1000.0),
    NEW.message_text,
    CASE 
      WHEN NEW.attachments IS NOT NULL THEN 'media'
      ELSE 'text'
    END,
    NEW.sender_id,
    1,
    CASE WHEN v_is_customer_message THEN 1 ELSE 0 END,
    v_customer_name,
    v_customer_profile_pic,
    v_customer_is_verified,
    -- 고객 메시지일 때만 24시간 윈도우 설정
    CASE 
      WHEN v_is_customer_message THEN 
        to_timestamp(NEW.message_timestamp / 1000.0) + INTERVAL '24 hours'
      ELSE NULL
    END,
    'standard',  -- 항상 standard (24시간)
    jsonb_build_object(
      'participant_1_id', v_participant_1,
      'participant_2_id', v_participant_2,
      'webhook_type', NEW.webhook_type,
      'is_echo', NEW.is_echo
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (platform, platform_conversation_id) DO UPDATE SET
    status = CASE 
      WHEN v_is_customer_message AND conversations.status = 'completed' 
        THEN 'in_progress'
      ELSE conversations.status
    END,
    last_message_at = to_timestamp(NEW.message_timestamp / 1000.0),
    last_message_text = NEW.message_text,
    last_message_type = CASE 
      WHEN NEW.attachments IS NOT NULL THEN 'media'
      ELSE 'text'
    END,
    last_sender_id = NEW.sender_id,
    message_count = conversations.message_count + 1,
    unread_count = CASE 
      WHEN v_is_customer_message THEN conversations.unread_count + 1
      ELSE conversations.unread_count
    END,
    customer_name = COALESCE(v_customer_name, conversations.customer_name),
    customer_profile_pic = COALESCE(v_customer_profile_pic, conversations.customer_profile_pic),
    customer_is_verified = COALESCE(v_customer_is_verified, conversations.customer_is_verified),
    -- 고객 메시지일 때만 24시간 윈도우 갱신
    messaging_window_expires_at = CASE 
      WHEN v_is_customer_message THEN 
        to_timestamp(NEW.message_timestamp / 1000.0) + INTERVAL '24 hours'
      ELSE 
        conversations.messaging_window_expires_at
    END,
    messaging_window_type = 'standard',  -- 항상 standard
    platform_data = conversations.platform_data || jsonb_build_object(
      'last_webhook_type', NEW.webhook_type,
      'last_is_echo', NEW.is_echo,
      'last_update', CURRENT_TIMESTAMP
    ),
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$function$

```

### sync_line_all_in_one
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_line_all_in_one()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conversation_id TEXT;
  v_customer_id TEXT;
  v_business_id TEXT;
  v_is_customer_message BOOLEAN;
  v_customer_name TEXT;
  v_customer_profile_pic TEXT;
  v_conversation_type TEXT;
BEGIN
  -- webhook_type이 message가 아니면 처리하지 않음
  IF NEW.webhook_type != 'message' THEN
    RETURN NEW;
  END IF;

  -- 대화 유형 판별 (user/group/room)
  IF NEW.source_user_id IS NOT NULL THEN
    v_conversation_id := NEW.source_user_id;
    v_conversation_type := 'user';
  ELSIF NEW.source_group_id IS NOT NULL THEN
    v_conversation_id := NEW.source_group_id;
    v_conversation_type := 'group';
  ELSIF NEW.source_room_id IS NOT NULL THEN
    v_conversation_id := NEW.source_room_id;
    v_conversation_type := 'room';
  ELSE
    RETURN NEW;
  END IF;

  -- 고객/비즈니스 ID 설정
  v_customer_id := v_conversation_id;
  v_business_id := 'line_business_account';
  
  -- 메시지 방향 판별 (reply_token 없으면 비즈니스가 보낸 메시지)
  v_is_customer_message := (NEW.reply_token IS NOT NULL);

  -- 프로필 정보 조회 (있으면)
  SELECT 
    display_name,
    picture_url
  INTO 
    v_customer_name,
    v_customer_profile_pic
  FROM line_user_profiles
  WHERE user_id = v_customer_id
  LIMIT 1;

  -- conversations 테이블 업데이트
  INSERT INTO conversations (
    platform,
    platform_conversation_id,
    customer_id,
    business_account_id,
    status,
    last_message_at,
    last_message_text,
    last_message_type,
    last_sender_id,
    message_count,
    unread_count,
    customer_name,
    customer_profile_pic,
    customer_is_verified,
    messaging_window_expires_at,  -- LINE은 항상 NULL
    messaging_window_type,         -- LINE은 항상 NULL
    platform_data,
    created_at,
    updated_at
  ) VALUES (
    'line',
    v_conversation_id,
    v_customer_id,
    v_business_id,
    CASE WHEN v_is_customer_message THEN 'in_progress' ELSE 'pending' END,
    to_timestamp(NEW.timestamp / 1000.0),
    NEW.message_text,
    COALESCE(NEW.message_type, 'text'),
    CASE WHEN v_is_customer_message THEN v_customer_id ELSE v_business_id END,
    1,
    CASE WHEN v_is_customer_message THEN 1 ELSE 0 END,
    v_customer_name,
    v_customer_profile_pic,
    'false',
    NULL,  -- LINE은 메시징 윈도우 제한 없음
    NULL,  -- LINE은 메시징 윈도우 타입 없음
    jsonb_build_object(
      'type', v_conversation_type,
      'group_id', NEW.source_group_id,
      'room_id', NEW.source_room_id
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (platform, platform_conversation_id) DO UPDATE SET
    status = CASE 
      WHEN v_is_customer_message AND conversations.status = 'completed' 
        THEN 'in_progress'
      ELSE conversations.status
    END,
    last_message_at = to_timestamp(NEW.timestamp / 1000.0),
    last_message_text = NEW.message_text,
    last_message_type = COALESCE(NEW.message_type, 'text'),
    last_sender_id = CASE WHEN v_is_customer_message THEN v_customer_id ELSE v_business_id END,
    message_count = conversations.message_count + 1,
    unread_count = CASE 
      WHEN v_is_customer_message THEN conversations.unread_count + 1
      ELSE conversations.unread_count
    END,
    customer_name = COALESCE(v_customer_name, conversations.customer_name),
    customer_profile_pic = COALESCE(v_customer_profile_pic, conversations.customer_profile_pic),
    -- LINE은 메시징 윈도우 관련 필드를 업데이트하지 않음 (항상 NULL)
    platform_data = conversations.platform_data || jsonb_build_object(
      'last_webhook_type', NEW.webhook_type,
      'last_update', CURRENT_TIMESTAMP
    ),
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$function$

```

### sync_line_to_unified_conversations
- **Returns**: trigger
- **Language**: plpgsql
- **Volatility**: VOLATILE

```sql
CREATE OR REPLACE FUNCTION public.sync_line_to_unified_conversations()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conversation_id TEXT;
  v_business_account_id TEXT;
  v_customer_id TEXT;
  v_customer_name TEXT;
  v_customer_pic TEXT;
  v_customer_verified BOOLEAN;
  v_is_customer_message BOOLEAN;
BEGIN
  -- 대화 ID 결정
  v_conversation_id := COALESCE(NEW.user_id, NEW.group_id, NEW.room_id);
  
  -- NULL 체크
  IF v_conversation_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- LINE에서는 business_account_id를 'line_business_account'로 고정
  v_business_account_id := 'line_business_account';
  
  -- customer_id 설정 (user_id가 있으면 사용, 없으면 conversation_id 사용)
  v_customer_id := COALESCE(NEW.user_id, v_conversation_id);
  
  -- 고객 메시지인지 판별
  v_is_customer_message := (TG_TABLE_NAME = 'line_webhooks');
  
  -- user_profiles 테이블에서 프로필 데이터 조회
  SELECT 
    display_name,
    profile_pic,
    false  -- LINE은 verified 개념 없음
  INTO 
    v_customer_name,
    v_customer_pic,
    v_customer_verified
  FROM user_profiles
  WHERE platform = 'line' 
    AND platform_user_id = v_customer_id
  LIMIT 1;
  
  -- conversations 테이블 업데이트
  INSERT INTO conversations (
    platform,
    platform_conversation_id,
    customer_id,
    business_account_id,
    status,
    last_message_at,
    last_message_text,
    last_message_type,
    last_sender_id,
    customer_name,
    customer_profile_pic,
    customer_is_verified,
    messaging_window_expires_at,  -- 추가
    messaging_window_type,         -- 추가
    platform_data,
    created_at,
    updated_at,
    unread_count,
    message_count
  )
  VALUES (
    'line',
    v_conversation_id,
    v_customer_id,
    v_business_account_id,
    'in_progress',
    NEW.created_at,
    CASE 
      WHEN TG_TABLE_NAME = 'line_webhooks' THEN NEW.message_text
      WHEN TG_TABLE_NAME = 'line_sent_messages' THEN NEW.message_text
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'line_webhooks' THEN NEW.message_type
      WHEN TG_TABLE_NAME = 'line_sent_messages' THEN NEW.message_type
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'line_webhooks' THEN COALESCE(NEW.user_id, 'unknown')
      WHEN TG_TABLE_NAME = 'line_sent_messages' THEN 'line_business_account'
    END,
    v_customer_name,
    v_customer_pic,
    v_customer_verified,
    -- LINE은 메시징 윈도우 제한 없음
    NULL,  -- messaging_window_expires_at: LINE은 만료 없음
    NULL,  -- messaging_window_type: LINE은 제한 없음
    jsonb_build_object(
      'type', CASE 
        WHEN NEW.user_id IS NOT NULL THEN 'user'
        WHEN NEW.group_id IS NOT NULL THEN 'group'
        WHEN NEW.room_id IS NOT NULL THEN 'room'
      END,
      'group_id', NEW.group_id,
      'room_id', NEW.room_id
    ),
    NEW.created_at,
    NEW.created_at,
    CASE 
      WHEN TG_TABLE_NAME = 'line_webhooks' THEN 1
      ELSE 0
    END,
    1
  )
  ON CONFLICT (platform, platform_conversation_id)
  DO UPDATE SET
    last_message_at = EXCLUDED.last_message_at,
    last_message_text = EXCLUDED.last_message_text,
    last_message_type = EXCLUDED.last_message_type,
    last_sender_id = EXCLUDED.last_sender_id,
    customer_name = COALESCE(EXCLUDED.customer_name, conversations.customer_name),
    customer_profile_pic = COALESCE(EXCLUDED.customer_profile_pic, conversations.customer_profile_pic),
    customer_is_verified = COALESCE(EXCLUDED.customer_is_verified, conversations.customer_is_verified),
    -- LINE은 메시징 윈도우 제한 없음 (변경하지 않음)
    messaging_window_expires_at = conversations.messaging_window_expires_at,
    messaging_window_type = conversations.messaging_window_type,
    platform_data = EXCLUDED.platform_data,
    updated_at = NOW(),
    unread_count = CASE
      WHEN TG_TABLE_NAME = 'line_webhooks' THEN 
        COALESCE(conversations.unread_count, 0) + 1
      WHEN TG_TABLE_NAME = 'line_sent_messages' THEN 
        conversations.unread_count
      ELSE conversations.unread_count
    END,
    message_count = COALESCE(conversations.message_count, 0) + 1,
    status = CASE 
      WHEN conversations.status = 'completed' THEN 'in_progress'
      ELSE conversations.status
    END;
    
  RETURN NEW;
END;
$function$

```

## Extensions

- **plpgsql** (v1.0): PL/pgSQL procedural language
- **pg_stat_statements** (v1.11): track planning and execution statistics of all SQL statements executed
- **uuid-ossp** (v1.1): generate universally unique identifiers (UUIDs)
- **pgcrypto** (v1.3): cryptographic functions
- **supabase_vault** (v0.3.1): Supabase Vault Extension
- **pg_graphql** (v1.5.11): pg_graphql: GraphQL support