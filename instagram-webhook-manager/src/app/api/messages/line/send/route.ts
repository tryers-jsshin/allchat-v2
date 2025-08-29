import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, to, replyToken, messages } = body;

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelAccessToken) {
      return NextResponse.json(
        { error: 'LINE channel access token not configured' },
        { status: 500 }
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (messages.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 messages allowed per request' },
        { status: 400 }
      );
    }

    let endpoint: string;
    let requestBody: any;

    // Determine endpoint and body based on mode
    if (mode === 'reply') {
      if (!replyToken) {
        return NextResponse.json(
          { error: 'Reply token is required for reply mode' },
          { status: 400 }
        );
      }

      endpoint = `${LINE_API_BASE}/message/reply`;
      requestBody = {
        replyToken,
        messages
      };

      console.log('Sending LINE reply message:', {
        replyToken: replyToken.substring(0, 10) + '...',
        messageCount: messages.length
      });

    } else if (mode === 'push') {
      if (!to) {
        return NextResponse.json(
          { error: 'Recipient ID (to) is required for push mode' },
          { status: 400 }
        );
      }

      endpoint = `${LINE_API_BASE}/message/push`;
      requestBody = {
        to,
        messages
      };

      console.log('Sending LINE push message:', {
        to: to.substring(0, 10) + '...',
        messageCount: messages.length
      });

    } else if (mode === 'multicast') {
      if (!to || !Array.isArray(to)) {
        return NextResponse.json(
          { error: 'Recipients array (to) is required for multicast mode' },
          { status: 400 }
        );
      }

      if (to.length > 500) {
        return NextResponse.json(
          { error: 'Maximum 500 recipients allowed for multicast' },
          { status: 400 }
        );
      }

      endpoint = `${LINE_API_BASE}/message/multicast`;
      requestBody = {
        to,
        messages
      };

      console.log('Sending LINE multicast message:', {
        recipientCount: to.length,
        messageCount: messages.length
      });

    } else if (mode === 'broadcast') {
      endpoint = `${LINE_API_BASE}/message/broadcast`;
      requestBody = {
        messages
      };

      console.log('Sending LINE broadcast message:', {
        messageCount: messages.length
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid mode. Use: reply, push, multicast, or broadcast' },
        { status: 400 }
      );
    }

    // Send message to LINE API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Log request details for debugging
    console.log('LINE API request:', {
      endpoint,
      body: JSON.stringify(requestBody, null, 2)
    });

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      // Parse LINE error response
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          { 
            error: errorJson.message || 'Failed to send message',
            details: errorJson.details || []
          },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { 
            error: `LINE API error: ${response.status} ${response.statusText}`,
            details: errorText
          },
          { status: response.status }
        );
      }
    }

    // Parse successful response
    const responseData = await response.json().catch(() => ({}));
    
    console.log('LINE message sent successfully:', {
      mode,
      response: responseData
    });

    // Save sent message to database
    try {
      // Determine recipient ID(s)
      let recipientId = null;
      let groupId = null;
      let roomId = null;
      
      if (mode === 'push' && typeof to === 'string') {
        // Check if it's a user, group, or room ID
        if (to.startsWith('U')) {
          recipientId = to;
        } else if (to.startsWith('C')) {
          groupId = to;
        } else if (to.startsWith('R')) {
          roomId = to;
        }
      }

      // Save each message
      for (const message of messages) {
        const sentMessageData: any = {
          user_id: recipientId,
          group_id: groupId,
          room_id: roomId,
          reply_token: mode === 'reply' ? replyToken : null,
          message_type: message.type,
          message_text: message.type === 'text' ? message.text : null,
          request_data: requestBody,
          response_data: responseData,
          status: 'sent',
          sent_at: new Date()
        };

        // Add message-specific data
        if (message.type === 'template') {
          sentMessageData.template_type = message.template?.type;
          sentMessageData.template_data = message.template;
        }

        if (message.quickReply) {
          sentMessageData.quick_reply = message.quickReply;
        }

        if (['image', 'video', 'audio', 'file'].includes(message.type)) {
          sentMessageData.attachments = {
            type: message.type,
            originalContentUrl: message.originalContentUrl,
            previewImageUrl: message.previewImageUrl
          };
        }

        const { data, error } = await supabase
          .from('line_sent_messages')
          .insert(sentMessageData)
          .select()
          .single();

        if (error) {
          console.error('Error saving sent message to database:', error);
        } else {
          console.log('Sent message saved to database:', data.id);
        }
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if database save fails
    }

    return NextResponse.json({
      success: true,
      mode,
      messageCount: messages.length,
      sentAt: new Date().toISOString(),
      ...responseData
    });

  } catch (error) {
    console.error('Error sending LINE message:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to validate message structure
function validateMessage(message: any): boolean {
  if (!message.type) return false;

  switch (message.type) {
    case 'text':
      return typeof message.text === 'string' && message.text.length > 0;
    
    case 'sticker':
      return message.packageId && message.stickerId;
    
    case 'image':
    case 'video':
    case 'audio':
      return message.originalContentUrl && message.previewImageUrl;
    
    case 'location':
      return message.title && message.address && 
             typeof message.latitude === 'number' && 
             typeof message.longitude === 'number';
    
    case 'imagemap':
      return message.baseUrl && message.altText && 
             message.baseSize && message.actions;
    
    case 'template':
      return message.altText && message.template;
    
    case 'flex':
      return message.altText && message.contents;
    
    default:
      return false;
  }
}