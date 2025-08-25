import { NextRequest, NextResponse } from 'next/server'

// Instagram API base URL
const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v23.0'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      recipientId, 
      messageType = 'text', 
      content,
      mediaUrl,
      postId,
      messageId,
      reaction,
      accessToken 
    } = body

    // Validate required fields
    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      // Try to get from environment variable as fallback
      const envToken = process.env.INSTAGRAM_USER_ACCESS_TOKEN
      if (!envToken) {
        return NextResponse.json(
          { error: 'Access token is required' },
          { status: 400 }
        )
      }
      body.accessToken = envToken
    }

    // Get Instagram Business Account ID from environment or request
    const igBusinessId = body.igBusinessId || process.env.INSTAGRAM_BUSINESS_ID || 'me'

    // Construct message payload based on type
    let messagePayload: any = {
      recipient: {
        id: recipientId
      }
    }

    switch (messageType) {
      case 'text':
        if (!content) {
          return NextResponse.json(
            { error: 'Text content is required for text messages' },
            { status: 400 }
          )
        }
        messagePayload.message = {
          text: content
        }
        break

      case 'image':
      case 'gif':
        if (!mediaUrl) {
          return NextResponse.json(
            { error: 'Media URL is required for image/gif messages' },
            { status: 400 }
          )
        }
        messagePayload.message = {
          attachment: {
            type: 'image',
            payload: {
              url: mediaUrl
            }
          }
        }
        break

      case 'video':
        if (!mediaUrl) {
          return NextResponse.json(
            { error: 'Media URL is required for video messages' },
            { status: 400 }
          )
        }
        messagePayload.message = {
          attachment: {
            type: 'video',
            payload: {
              url: mediaUrl
            }
          }
        }
        break

      case 'audio':
        if (!mediaUrl) {
          return NextResponse.json(
            { error: 'Media URL is required for audio messages' },
            { status: 400 }
          )
        }
        messagePayload.message = {
          attachment: {
            type: 'audio',
            payload: {
              url: mediaUrl
            }
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

      case 'reaction':
        if (!messageId || !reaction) {
          return NextResponse.json(
            { error: 'Message ID and reaction type are required for reactions' },
            { status: 400 }
          )
        }
        messagePayload = {
          recipient: {
            id: recipientId
          },
          sender_action: 'react',
          payload: {
            message_id: messageId,
            reaction: reaction // love, wow, sad, angry, etc.
          }
        }
        break

      case 'media_share':
        if (!postId) {
          return NextResponse.json(
            { error: 'Post ID is required for sharing posts' },
            { status: 400 }
          )
        }
        messagePayload.message = {
          attachment: {
            type: 'MEDIA_SHARE',
            payload: {
              id: postId
            }
          }
        }
        break

      default:
        return NextResponse.json(
          { error: `Unsupported message type: ${messageType}` },
          { status: 400 }
        )
    }

    // Send message to Instagram API
    const response = await fetch(
      `${INSTAGRAM_API_BASE}/${igBusinessId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${body.accessToken || process.env.INSTAGRAM_USER_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Instagram API error:', data)
      return NextResponse.json(
        { 
          error: 'Failed to send message',
          details: data.error || data
        },
        { status: response.status }
      )
    }

    // Log successful message send
    console.log('✅ Message sent successfully:', {
      recipientId,
      messageType,
      responseData: data
    })

    return NextResponse.json({
      success: true,
      data: data,
      messageType,
      recipientId
    })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}