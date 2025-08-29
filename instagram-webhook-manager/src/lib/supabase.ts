import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ===== Enum Types =====
export type Platform = 'instagram' | 'line' | 'kakao' | 'whatsapp'
export type ConversationStatus = 'pending' | 'in_progress' | 'completed'
export type SenderType = 'customer' | 'business' | 'system'
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location' | 'template' | 'postback' | 'quick_reply'
export type MessagingWindowType = 'standard' | null

// ===== Core Tables =====

/**
 * Conversations table - 모든 플랫폼의 대화 통합 관리
 */
export type Conversation = {
  id: string
  platform: Platform
  platform_conversation_id: string
  customer_id: string
  business_account_id: string
  status?: ConversationStatus
  last_message_at?: string | null
  last_message_text?: string | null
  last_message_type?: string | null
  last_sender_id?: string | null
  unread_count?: number
  message_count?: number
  platform_data?: any | null
  created_at?: string
  updated_at?: string
  customer_name?: string | null
  customer_profile_pic?: string | null
  customer_is_verified?: boolean
  messaging_window_expires_at?: string | null  // Instagram: 고객 메시지 + 24시간, LINE: null
  messaging_window_type?: MessagingWindowType  // Instagram: 'standard', LINE: null
}

/**
 * Messages table - 모든 플랫폼의 메시지 통합 저장
 */
export type Message = {
  id: string
  conversation_id: string  // FK → conversations.id
  platform: Platform
  sender_type: SenderType
  sender_id: string
  recipient_id: string
  message_text?: string | null
  message_type?: MessageType | null
  attachments?: any | null  // JSONB - 미디어, 위치, 스티커 등
  original_message_id?: string | null  // 플랫폼별 원본 메시지 ID (중복 방지)
  message_timestamp: string  // 플랫폼에서 메시지가 발생한 시각
  created_at?: string  // DB에 저장된 시각
}

// ===== Instagram Tables =====

/**
 * Instagram webhooks table - Instagram 웹훅 이벤트 원본 저장
 */
export type InstagramWebhook = {
  // Primary key
  id?: string
  
  // Core fields
  webhook_type: string
  raw_data: any
  created_at?: string
  processed?: boolean
  
  // Entry level
  entry_id?: string
  entry_time?: number
  
  // Messaging level
  sender_id?: string
  recipient_id?: string
  message_timestamp?: number
  
  // Message fields
  message_id?: string
  message_text?: string
  is_deleted?: boolean
  is_echo?: boolean
  is_unsupported?: boolean
  
  // Attachments
  attachments?: any[]
  attachment_types?: string[]
  
  // Reply information
  reply_to_message_id?: string
  reply_to_story_id?: string
  reply_to_story_url?: string
  
  // Quick Reply
  quick_reply_payload?: string
  
  // Reaction fields
  reaction_action?: string
  reaction_type?: string
  reaction_emoji?: string
  reaction_target_mid?: string
  
  // Postback fields
  postback_title?: string
  postback_payload?: string
  postback_mid?: string
  
  // Referral fields
  referral_ref?: string
  referral_source?: string
  referral_type?: string
  referral_product_id?: string
  referral_ad_id?: string
  referral_ads_context?: any
  
  // Read receipt
  read_message_id?: string
  
  // Profile relationship
  sender_profile_id?: string
}

// Legacy alias for backward compatibility
export type WebhookRecord = InstagramWebhook

/**
 * Instagram user profiles table - Instagram 사용자 프로필 캐싱
 */
export type InstagramUserProfile = {
  id?: string
  igsid: string
  name?: string | null
  username?: string | null
  profile_pic?: string | null
  profile_pic_updated_at?: string
  follower_count?: number
  is_verified_user?: boolean
  is_user_follow_business?: boolean
  is_business_follow_user?: boolean
  has_user_consent?: boolean
  consent_granted_at?: string
  raw_profile_data?: any
  created_at?: string
  updated_at?: string
  last_fetched_at?: string
  fetch_error?: string | null
  cache_expires_at?: string
  fetch_count?: number
  first_message_at?: string
  last_message_at?: string
  total_messages?: number
  is_active?: boolean
  notes?: string | null
}

// Legacy alias for backward compatibility
export type UserProfile = InstagramUserProfile

// ===== LINE Tables =====

/**
 * LINE webhooks table - LINE 웹훅 이벤트 원본 저장
 */
export type LineWebhook = {
  id?: string
  webhook_type: string
  raw_data: any
  user_id?: string | null
  group_id?: string | null
  room_id?: string | null
  message_id?: string | null
  message_type?: string | null
  message_text?: string | null
  attachments?: any | null
  sticker_package_id?: string | null
  sticker_id?: string | null
  location_title?: string | null
  location_address?: string | null
  location_latitude?: number | null
  location_longitude?: number | null
  reply_token?: string | null
  postback_data?: string | null
  postback_params?: any | null
  timestamp?: number | null
  created_at?: string
  processed?: boolean
  processed_at?: string | null
}

/**
 * LINE sent messages table - LINE 전송 메시지 관리
 */
export type LineSentMessage = {
  id?: string
  user_id?: string | null
  group_id?: string | null
  room_id?: string | null
  reply_token?: string | null
  message_type: string
  message_text?: string | null
  attachments?: any | null
  template_type?: string | null
  template_data?: any | null
  quick_reply?: any | null
  request_data: any
  response_data?: any | null
  status?: string
  error_message?: string | null
  retry_count?: number
  sent_at?: string
  created_at?: string
}

/**
 * LINE user profiles table - LINE 사용자 프로필 캐싱
 */
export type LineUserProfile = {
  id?: string
  user_id: string
  display_name?: string | null
  picture_url?: string | null
  language?: string | null
  cache_expires_at?: string
  last_fetched_at?: string
  created_at?: string
  updated_at?: string
}

// ===== Unified Tables =====

/**
 * User profiles table - 통합 사용자 프로필
 */
export type UnifiedUserProfile = {
  id?: string
  platform: Platform
  platform_user_id: string
  display_name?: string | null
  username?: string | null
  profile_pic?: string | null
  platform_data?: any | null
  created_at?: string
  updated_at?: string
}

// ===== Translation Tables =====

/**
 * Translations table - 메시지 번역 저장 및 캐싱
 */
export type Translation = {
  id?: string
  message_id?: string | null  // FK → messages.id (optional for cached translations)
  original_text: string
  translated_text: string
  source_lang?: string | null  // NULL means auto-detected
  target_lang: string
  translation_provider?: string  // 'deepl', 'google', etc.
  response_time_ms?: number | null
  character_count?: number | null
  created_at?: string
}