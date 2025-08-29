import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for Storage operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for Storage operations
);

// LINE API configuration
const LINE_CONTENT_API_BASE = 'https://api-data.line.me/v2/bot/message';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Helper function to determine file extension from message type
function getFileExtension(messageType: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop();
    if (ext) return ext;
  }
  
  switch (messageType) {
    case 'image':
      return 'jpg'; // LINE typically uses JPEG
    case 'video':
      return 'mp4';
    case 'audio':
      return 'm4a';
    case 'file':
      return 'bin'; // Generic binary if no filename
    default:
      return 'bin';
  }
}

// Helper function to get content type
function getContentType(messageType: string): string {
  switch (messageType) {
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    case 'audio':
      return 'audio/mp4';
    default:
      return 'application/octet-stream';
  }
}

// POST: Download LINE content and save to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const { messageId, messageType, fileName, webhookId } = await request.json();

    if (!messageId || !messageType) {
      return NextResponse.json(
        { error: 'messageId and messageType are required' },
        { status: 400 }
      );
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
      return NextResponse.json(
        { error: 'LINE channel access token not configured' },
        { status: 500 }
      );
    }

    console.log(`Downloading LINE ${messageType} content:`, {
      messageId,
      messageType,
      fileName,
      webhookId
    });

    // Step 1: Download content from LINE
    const lineResponse = await fetch(
      `${LINE_CONTENT_API_BASE}/${messageId}/content`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    if (!lineResponse.ok) {
      console.error('LINE API error:', {
        status: lineResponse.status,
        statusText: lineResponse.statusText
      });
      
      // Handle specific LINE API errors
      if (lineResponse.status === 404) {
        return NextResponse.json(
          { error: 'Content not found or expired' },
          { status: 404 }
        );
      }
      
      if (lineResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: `LINE API error: ${lineResponse.statusText}` },
        { status: lineResponse.status }
      );
    }

    // Get binary data
    const blob = await lineResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Downloaded ${buffer.length} bytes`);

    // Step 2: Generate storage path
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = getFileExtension(messageType, fileName);
    const storagePath = `${messageType}s/${year}/${month}/${messageId}.${extension}`;

    console.log(`Uploading to Supabase Storage:`, {
      bucket: 'line-media',
      path: storagePath,
      size: buffer.length
    });

    // Step 3: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('line-media')
      .upload(storagePath, buffer, {
        contentType: getContentType(messageType),
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      // If file already exists, get its URL
      if (uploadError.message?.includes('already exists')) {
        const { data: publicUrlData } = supabase.storage
          .from('line-media')
          .getPublicUrl(storagePath);
        
        console.log('File already exists, returning existing URL');
        
        return NextResponse.json({
          url: publicUrlData.publicUrl,
          path: storagePath,
          cached: true
        });
      }
      
      console.error('Supabase Storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // Step 4: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('line-media')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    console.log(`Successfully stored LINE ${messageType}:`, {
      messageId,
      storagePath,
      publicUrl
    });

    // Step 5: Update webhook record if webhookId provided
    if (webhookId) {
      // Get current webhook data
      const { data: webhookData, error: fetchError } = await supabase
        .from('line_webhooks')
        .select('attachments')
        .eq('id', webhookId)
        .single();

      if (!fetchError && webhookData) {
        // Update attachments with download info
        const updatedAttachments = {
          ...webhookData.attachments,
          originalUrl: publicUrl,
          storagePath,
          downloaded: true,
          downloadedAt: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('line_webhooks')
          .update({ attachments: updatedAttachments })
          .eq('id', webhookId);

        if (updateError) {
          console.error('Failed to update webhook record:', updateError);
        } else {
          console.log('Updated webhook record with download info');
        }
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
      size: buffer.length,
      messageType,
      messageId
    });

  } catch (error) {
    console.error('LINE content download error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: Check download status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const messageType = searchParams.get('messageType');

    if (!messageId || !messageType) {
      return NextResponse.json(
        { error: 'messageId and messageType are required' },
        { status: 400 }
      );
    }

    // Check if file exists in storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = getFileExtension(messageType);
    const storagePath = `${messageType}s/${year}/${month}/${messageId}.${extension}`;

    const { data: listData, error: listError } = await supabase.storage
      .from('line-media')
      .list(`${messageType}s/${year}/${month}`, {
        limit: 1,
        search: `${messageId}.${extension}`
      });

    if (listError) {
      console.error('Storage list error:', listError);
      return NextResponse.json(
        { exists: false, error: listError.message },
        { status: 500 }
      );
    }

    const exists = listData && listData.length > 0;

    if (exists) {
      const { data: publicUrlData } = supabase.storage
        .from('line-media')
        .getPublicUrl(storagePath);

      return NextResponse.json({
        exists: true,
        url: publicUrlData.publicUrl,
        path: storagePath
      });
    }

    return NextResponse.json({
      exists: false
    });

  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}