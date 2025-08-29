import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { broadcastLineWebhookEvent } from './stream/route';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Store webhook events in memory for demo (in production, use database)
const MAX_EVENTS = 100;

// Declare global type
declare global {
  var lineWebhookEvents: any[] | undefined;
}

// Initialize global storage
global.lineWebhookEvents = global.lineWebhookEvents || [];

// Verify LINE webhook signature
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// GET: Webhook URL verification (optional)
export async function GET(request: NextRequest) {
  // LINE doesn't require GET verification like Instagram
  // This endpoint is for testing connectivity
  return NextResponse.json({ 
    status: 'ok',
    message: 'LINE webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}

// POST: Receive webhook events
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-line-signature');
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    // Log for debugging
    console.log('LINE Webhook received:', {
      signature: signature?.substring(0, 10) + '...',
      bodyLength: rawBody.length,
      timestamp: new Date().toISOString()
    });

    // Verify signature if secret is configured
    if (channelSecret && signature) {
      const isValid = verifySignature(rawBody, signature, channelSecret);
      if (!isValid) {
        console.error('Invalid LINE webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      console.warn('LINE webhook signature verification skipped (no secret configured)');
    }

    // Parse webhook body
    const body = JSON.parse(rawBody);
    console.log('LINE Webhook body:', JSON.stringify(body, null, 2));

    // Process each event
    const { events, destination } = body;
    
    if (!events || !Array.isArray(events)) {
      console.log('No events in webhook body');
      return NextResponse.json({ status: 'ok', message: 'No events' });
    }

    for (const event of events) {
      console.log(`Processing LINE event: ${event.type}`, {
        webhookEventId: event.webhookEventId,
        timestamp: event.timestamp,
        source: event.source,
        replyToken: event.replyToken
      });

      // Store event for demo page
      const storedEvent = {
        id: event.webhookEventId || crypto.randomUUID(),
        timestamp: new Date(event.timestamp || Date.now()).toISOString(),
        type: event.type,
        source: event.source,
        message: event.message,
        replyToken: event.replyToken,
        mode: event.mode,
        deliveryContext: event.deliveryContext,
        raw: event
      };

      global.lineWebhookEvents.unshift(storedEvent);
      if (global.lineWebhookEvents.length > MAX_EVENTS) {
        global.lineWebhookEvents = global.lineWebhookEvents.slice(0, MAX_EVENTS);
      }

      // Broadcast event to all connected SSE clients
      broadcastLineWebhookEvent(storedEvent);

      // Save webhook event to database
      try {
        const webhookData: any = {
          webhook_type: event.type,
          raw_data: event,
          user_id: event.source?.userId || null,
          group_id: event.source?.groupId || null,
          room_id: event.source?.roomId || null,
          timestamp: event.timestamp || Date.now(),
          reply_token: event.replyToken || null
        };

        // Add message-specific fields
        if (event.type === 'message' && event.message) {
          webhookData.message_id = event.message.id;
          webhookData.message_type = event.message.type;
          webhookData.message_text = event.message.type === 'text' ? event.message.text : null;
          
          // Handle different message types
          if (event.message.type === 'sticker') {
            webhookData.sticker_package_id = event.message.packageId;
            webhookData.sticker_id = event.message.stickerId;
          } else if (event.message.type === 'location') {
            webhookData.location_title = event.message.title;
            webhookData.location_address = event.message.address;
            webhookData.location_latitude = event.message.latitude;
            webhookData.location_longitude = event.message.longitude;
          } else if (event.message.type === 'image') {
            // 이미지 메시지 상세 로깅
            console.log('Image message details:', {
              id: event.message.id,
              contentProvider: event.message.contentProvider,
              imageSet: event.message.imageSet,
              quoteToken: event.message.quoteToken,
              fullMessage: JSON.stringify(event.message, null, 2)
            });
            
            webhookData.attachments = {
              type: 'image',
              messageId: event.message.id,
              contentProvider: event.message.contentProvider || { type: 'line' },
              imageSet: event.message.imageSet || null,
              quoteToken: event.message.quoteToken || null
            };
          } else if (event.message.type === 'video') {
            // 비디오 메시지 상세 로깅
            console.log('Video message details:', {
              id: event.message.id,
              duration: event.message.duration,
              contentProvider: event.message.contentProvider,
              fullMessage: JSON.stringify(event.message, null, 2)
            });
            
            webhookData.attachments = {
              type: 'video',
              messageId: event.message.id,
              duration: event.message.duration,
              contentProvider: event.message.contentProvider || { type: 'line' },
              // external provider인 경우 URL 포함
              originalContentUrl: event.message.contentProvider?.originalContentUrl,
              previewImageUrl: event.message.contentProvider?.previewImageUrl
            };
          } else if (event.message.type === 'audio') {
            // 오디오 메시지 상세 로깅
            console.log('Audio message details:', {
              id: event.message.id,
              duration: event.message.duration,
              contentProvider: event.message.contentProvider,
              fullMessage: JSON.stringify(event.message, null, 2)
            });
            
            webhookData.attachments = {
              type: 'audio',
              messageId: event.message.id,
              duration: event.message.duration,
              contentProvider: event.message.contentProvider || { type: 'line' }
            };
          } else if (event.message.type === 'file') {
            // 파일 메시지 상세 로깅
            console.log('File message details:', {
              id: event.message.id,
              fileName: event.message.fileName,
              fileSize: event.message.fileSize,
              fullMessage: JSON.stringify(event.message, null, 2)
            });
            
            webhookData.message_text = event.message.fileName; // 검색 가능하도록
            webhookData.attachments = {
              type: 'file',
              messageId: event.message.id,
              fileName: event.message.fileName,
              fileSize: event.message.fileSize
            };
          }
        }

        // Add postback-specific fields
        if (event.type === 'postback' && event.postback) {
          webhookData.postback_data = event.postback.data;
          webhookData.postback_params = event.postback.params;
        }

        // Download media content before saving if it's a media message
        if (event.type === 'message' && event.message && 
            ['image', 'video', 'audio', 'file'].includes(event.message.type)) {
          
          console.log(`Downloading ${event.message.type} content before saving to DB...`);
          
          // Retry logic for download
          let downloadSuccess = false;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (!downloadSuccess && retryCount < maxRetries) {
            try {
              // Call download API and wait for result
              const downloadResponse = await fetch(
                `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/messages/line/content`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    messageId: event.message.id,
                    messageType: event.message.type,
                    fileName: event.message.fileName || undefined
                  })
                }
              );

              if (downloadResponse.ok) {
                const downloadResult = await downloadResponse.json();
                console.log(`Media downloaded successfully:`, downloadResult);
                
                // Update attachments with download info BEFORE saving to DB
                webhookData.attachments = {
                  ...webhookData.attachments,
                  originalUrl: downloadResult.url,
                  storagePath: downloadResult.path,
                  downloaded: true,
                  downloadedAt: new Date().toISOString()
                };
                downloadSuccess = true;
              } else {
                throw new Error(`Download failed: ${downloadResponse.statusText}`);
              }
            } catch (downloadError) {
              retryCount++;
              console.error(`Download attempt ${retryCount}/${maxRetries} failed:`, downloadError);
              
              if (retryCount < maxRetries) {
                // Wait before retry (progressive delay: 500ms, 1000ms, 1500ms)
                const delay = retryCount * 500;
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                // Final failure - save with error
                console.error(`Failed to download after ${maxRetries} attempts`);
                webhookData.attachments = {
                  ...webhookData.attachments,
                  downloaded: false,
                  downloadError: downloadError instanceof Error ? downloadError.message : 'Unknown error',
                  retryCount: retryCount
                };
              }
            }
          }
        }

        // Insert into database (with URL if download succeeded)
        const { data, error } = await supabase
          .from('line_webhooks')
          .insert(webhookData)
          .select()
          .single();

        if (error) {
          console.error('Error saving webhook to database:', error);
        } else {
          console.log('Webhook saved to database:', data.id);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue processing even if database save fails
      }

      // Process based on event type
      switch (event.type) {
        case 'message':
          console.log('Message event:', {
            messageId: event.message?.id,
            messageType: event.message?.type,
            text: event.message?.text,
            userId: event.source?.userId,
            groupId: event.source?.groupId,
            roomId: event.source?.roomId
          });

          // Log message content details
          if (event.message) {
            switch (event.message.type) {
              case 'text':
                console.log('Text message:', event.message.text);
                if (event.message.mention) {
                  console.log('Mentions:', event.message.mention);
                }
                if (event.message.quotedMessageId) {
                  console.log('Quoted message ID:', event.message.quotedMessageId);
                }
                break;
              case 'image':
              case 'video':
              case 'audio':
              case 'file':
                console.log(`Media message (${event.message.type}):`, {
                  contentProvider: event.message.contentProvider,
                  duration: event.message.duration,
                  fileName: event.message.fileName,
                  fileSize: event.message.fileSize
                });
                break;
              case 'location':
                console.log('Location message:', {
                  title: event.message.title,
                  address: event.message.address,
                  latitude: event.message.latitude,
                  longitude: event.message.longitude
                });
                break;
              case 'sticker':
                console.log('Sticker message:', {
                  packageId: event.message.packageId,
                  stickerId: event.message.stickerId
                });
                break;
            }
          }
          break;

        case 'follow':
          console.log('Follow event - New friend added:', {
            userId: event.source?.userId,
            isNotification: event.follow?.isNotification
          });
          break;

        case 'unfollow':
          console.log('Unfollow event - Friend blocked:', {
            userId: event.source?.userId
          });
          break;

        case 'join':
          console.log('Join event - Bot joined group/room:', {
            type: event.source?.type,
            groupId: event.source?.groupId,
            roomId: event.source?.roomId
          });
          break;

        case 'leave':
          console.log('Leave event - Bot left group/room:', {
            type: event.source?.type,
            groupId: event.source?.groupId,
            roomId: event.source?.roomId
          });
          break;

        case 'memberJoined':
          console.log('Member joined:', {
            groupId: event.source?.groupId,
            members: event.joined?.members
          });
          break;

        case 'memberLeft':
          console.log('Member left:', {
            groupId: event.source?.groupId,
            members: event.left?.members
          });
          break;

        case 'postback':
          console.log('Postback event:', {
            data: event.postback?.data,
            params: event.postback?.params
          });
          break;

        case 'unsend':
          console.log('Unsend event:', {
            messageId: event.unsend?.messageId
          });
          break;

        case 'videoPlayComplete':
          console.log('Video play complete:', {
            trackingId: event.videoPlayComplete?.trackingId
          });
          break;

        case 'beacon':
          console.log('Beacon event:', {
            type: event.beacon?.type,
            hwid: event.beacon?.hwid,
            dm: event.beacon?.dm
          });
          break;

        case 'accountLink':
          console.log('Account link event:', {
            result: event.link?.result,
            nonce: event.link?.nonce
          });
          break;

        default:
          console.log(`Unknown event type: ${event.type}`);
      }

      // Log delivery context if this is a redelivered webhook
      if (event.deliveryContext?.isRedelivery) {
        console.log('This is a redelivered webhook');
      }
    }

    // Return success response
    return NextResponse.json({ 
      status: 'ok',
      received: events.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

