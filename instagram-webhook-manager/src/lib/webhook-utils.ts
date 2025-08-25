import crypto from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex')
  
  const expectedSig = `sha256=${expectedSignature}`
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )
}

export function parseWebhookPayload(payload: any) {
  const webhookData: any = {
    // Core fields
    webhook_type: 'unknown',
    raw_data: payload,
    
    // Entry level
    entry_id: null,
    entry_time: null,
    
    // Messaging level
    sender_id: null,
    recipient_id: null,
    message_timestamp: null,
    
    // Message fields
    message_id: null,
    message_text: null,
    is_deleted: false,
    is_echo: false,
    is_unsupported: false,
    
    // Attachments
    attachments: null,
    attachment_types: [],
    
    // Reply information
    reply_to_message_id: null,
    reply_to_story_id: null,
    reply_to_story_url: null,
    
    // Quick Reply
    quick_reply_payload: null,
    
    // Reaction fields
    reaction_action: null,
    reaction_type: null,
    reaction_emoji: null,
    reaction_target_mid: null,
    
    // Postback fields
    postback_title: null,
    postback_payload: null,
    postback_mid: null,
    
    // Referral fields
    referral_ref: null,
    referral_source: null,
    referral_type: null,
    referral_product_id: null,
    referral_ad_id: null,
    referral_ads_context: null,
    
    // Read receipt
    read_message_id: null,
  }

  if (!payload.entry || payload.entry.length === 0) {
    return webhookData
  }

  const entry = payload.entry[0]
  
  // Entry level data
  webhookData.entry_id = entry.id || null
  webhookData.entry_time = entry.time || null

  // Check for messaging array (Instagram webhooks)
  if (entry.messaging && entry.messaging.length > 0) {
    const messaging = entry.messaging[0]
    
    // Common messaging fields
    webhookData.sender_id = messaging.sender?.id || null
    webhookData.recipient_id = messaging.recipient?.id || null
    webhookData.message_timestamp = messaging.timestamp || null
    
    // Message
    if (messaging.message) {
      webhookData.webhook_type = 'message'
      webhookData.message_id = messaging.message.mid || null
      // Properly handle newlines in message text
      webhookData.message_text = messaging.message.text ? 
        messaging.message.text.replace(/\\n/g, '\n') : null
      webhookData.is_deleted = messaging.message.is_deleted || false
      webhookData.is_echo = messaging.message.is_echo || false
      webhookData.is_unsupported = messaging.message.is_unsupported || false
      
      // Handle attachments
      if (messaging.message.attachments && messaging.message.attachments.length > 0) {
        webhookData.attachments = messaging.message.attachments
        webhookData.attachment_types = messaging.message.attachments.map((att: any) => att.type)
        
        // Check for ephemeral media
        if (webhookData.attachment_types.includes('ephemeral')) {
          webhookData.webhook_type = 'ephemeral'
        }
      }
      
      // Handle quick reply
      if (messaging.message.quick_reply) {
        webhookData.quick_reply_payload = messaging.message.quick_reply.payload || null
      }
      
      // Handle reply_to
      if (messaging.message.reply_to) {
        if (messaging.message.reply_to.mid) {
          webhookData.reply_to_message_id = messaging.message.reply_to.mid
        }
        if (messaging.message.reply_to.story) {
          webhookData.reply_to_story_id = messaging.message.reply_to.story.id || null
          webhookData.reply_to_story_url = messaging.message.reply_to.story.url || null
        }
      }
      
      // Handle referral in message
      if (messaging.message.referral) {
        if (messaging.message.referral.product) {
          webhookData.referral_product_id = messaging.message.referral.product.id || null
        }
        if (messaging.message.referral.ad_id) {
          webhookData.referral_ad_id = messaging.message.referral.ad_id || null
          webhookData.referral_ref = messaging.message.referral.ref || null
          webhookData.referral_source = messaging.message.referral.source || null
          webhookData.referral_type = messaging.message.referral.type || null
          webhookData.referral_ads_context = messaging.message.referral.ads_context_data || null
        }
      }
    }
    
    // Reaction
    else if (messaging.reaction) {
      webhookData.webhook_type = 'reaction'
      webhookData.reaction_target_mid = messaging.reaction.mid || null
      webhookData.reaction_action = messaging.reaction.action || null
      webhookData.reaction_type = messaging.reaction.reaction || null
      webhookData.reaction_emoji = messaging.reaction.emoji || null
    }
    
    // Postback
    else if (messaging.postback) {
      webhookData.webhook_type = 'postback'
      webhookData.postback_mid = messaging.postback.mid || null
      webhookData.postback_title = messaging.postback.title || null
      webhookData.postback_payload = messaging.postback.payload || null
    }
    
    // Referral (standalone)
    else if (messaging.referral) {
      webhookData.webhook_type = 'referral'
      webhookData.referral_ref = messaging.referral.ref || null
      webhookData.referral_source = messaging.referral.source || null
      webhookData.referral_type = messaging.referral.type || null
    }
    
    // Read receipt
    else if (messaging.read) {
      webhookData.webhook_type = 'read'
      webhookData.read_message_id = messaging.read.mid || null
    }
    
    // Optin
    else if (messaging.optin) {
      webhookData.webhook_type = 'optin'
    }
  }
  
  // Check for changes array (Facebook/Instagram Graph API webhooks)
  else if (entry.changes && entry.changes.length > 0) {
    const change = entry.changes[0]
    webhookData.webhook_type = change.field || 'change'
  }

  return webhookData
}