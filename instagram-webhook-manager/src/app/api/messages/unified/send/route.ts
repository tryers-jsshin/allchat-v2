import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API base URLs
const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v23.0'
const LINE_API_BASE = 'https://api.line.me/v2/bot'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      platform,
      conversationId,
      recipientId,
      messageText,
      messageType = 'text',
      // Optional platform-specific fields
      mediaUrl,
      accessToken,
      replyToken
    } = body

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      )
    }

    if (!messageText && messageType === 'text') {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      )
    }

    // Route to appropriate platform handler
    if (platform === 'instagram') {
      return await sendInstagramMessage({
        recipientId: recipientId || conversationId,
        messageText,
        messageType,
        mediaUrl,
        accessToken
      })
    } else if (platform === 'line') {
      return await sendLineMessage({
        conversationId,
        messageText,
        messageType,
        replyToken
      })
    } else {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Unified send message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// Instagram message sender
async function sendInstagramMessage({
  recipientId,
  messageText,
  messageType,
  mediaUrl,
  accessToken
}: {
  recipientId: string
  messageText?: string
  messageType: string
  mediaUrl?: string
  accessToken?: string
}) {
  // Use environment token if not provided
  const token = accessToken || process.env.INSTAGRAM_USER_ACCESS_TOKEN
  
  if (!token) {
    return NextResponse.json(
      { error: 'Instagram access token not configured' },
      { status: 500 }
    )
  }

  const igBusinessId = process.env.INSTAGRAM_BUSINESS_ID || 'me'

  // Construct message payload (24-hour standard window)
  let messagePayload: any = {
    recipient: {
      id: recipientId
    }
  }

  switch (messageType) {
    case 'text':
      messagePayload.message = { text: messageText }
      break
    case 'image':
    case 'video':
    case 'audio':
      if (!mediaUrl) {
        return NextResponse.json(
          { error: 'Media URL is required for media messages' },
          { status: 400 }
        )
      }
      messagePayload.message = {
        attachment: {
          type: messageType,
          payload: { url: mediaUrl }
        }
      }
      break
    case 'sticker':
      messagePayload.message = {
        attachment: {
          type: 'like_heart'
        }
      }
      break
    default:
      return NextResponse.json(
        { error: `Unsupported message type: ${messageType}` },
        { status: 400 }
      )
  }

  // Send message via Instagram API
  const response = await fetch(
    `${INSTAGRAM_API_BASE}/${igBusinessId}/messages?access_token=${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload)
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Instagram API error:', data)
    
    // Handle specific error codes
    if (data.error?.error_subcode === 2534022) {
      // Messaging window expired (24-hour standard window)
      return NextResponse.json(
        { 
          error: '24시간 메시징 윈도우가 만료되었습니다',
          error_code: 'MESSAGING_WINDOW_EXPIRED',
          error_subcode: data.error.error_subcode
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { 
        error: data.error?.message || 'Failed to send Instagram message',
        error_code: data.error?.code,
        error_subcode: data.error?.error_subcode
      },
      { status: response.status }
    )
  }

  // Save to database (Instagram echo webhook will handle the actual save)
  console.log('Instagram message sent successfully:', data)

  return NextResponse.json({
    success: true,
    platform: 'instagram',
    messageId: data.message_id,
    recipientId: data.recipient_id
  })
}

// LINE message sender
async function sendLineMessage({
  conversationId,
  messageText,
  messageType,
  replyToken
}: {
  conversationId: string
  messageText?: string
  messageType: string
  replyToken?: string
}) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  
  if (!channelAccessToken) {
    return NextResponse.json(
      { error: 'LINE channel access token not configured' },
      { status: 500 }
    )
  }

  // Construct LINE message object
  const messages = []
  
  switch (messageType) {
    case 'text':
      messages.push({
        type: 'text',
        text: messageText
      })
      break
    default:
      // For now, only support text messages for LINE
      messages.push({
        type: 'text',
        text: messageText || 'Message'
      })
  }

  let endpoint: string
  let requestBody: any

  // Use push message (reply token support can be added later)
  endpoint = `${LINE_API_BASE}/message/push`
  requestBody = {
    to: conversationId,
    messages: messages
  }

  // Send message via LINE API
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify(requestBody)
  })

  // LINE API returns empty response on success
  if (response.status === 200) {
    // Save sent message to database
    const sentMessageData = {
      user_id: conversationId.startsWith('U') ? conversationId : null,
      group_id: conversationId.startsWith('C') ? conversationId : null,
      room_id: conversationId.startsWith('R') ? conversationId : null,
      message_text: messageText,
      message_type: 'text',
      status: 'sent',
      request_data: requestBody,
      response_data: {},
      sent_at: new Date().toISOString()
    }

    const { data: savedMessage, error: saveError } = await supabase
      .from('line_sent_messages')
      .insert(sentMessageData)
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save LINE message:', saveError)
    }

    return NextResponse.json({
      success: true,
      platform: 'line',
      messageId: savedMessage?.id || `line_${Date.now()}`,
      conversationId: conversationId
    })
  } else {
    const errorData = await response.text()
    console.error('LINE API error:', errorData)
    return NextResponse.json(
      { error: 'Failed to send LINE message', details: errorData },
      { status: response.status }
    )
  }
}