import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type WebhookRecord = {
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

export type UserProfile = {
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