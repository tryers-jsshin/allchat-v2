import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversation_id } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const after = searchParams.get('after') // 이 시간 이후의 메시지만 가져오기

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // 먼저 conversations 테이블에서 실제 conversation UUID 가져오기
    const { data: conversationData, error: convError } = await supabase
      .from('conversations')
      .select('id, platform, platform_conversation_id, customer_id, unread_count')
      .eq('platform_conversation_id', conversation_id)
      .single()

    if (convError || !conversationData) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // ====================================
    // 통합 messages 테이블에서 메시지 조회
    // ====================================
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationData.id)
      .order('message_timestamp', { ascending: false })
    
    // after 파라미터가 있으면 그 시간 이후 메시지만
    if (after) {
      query = query.gt('created_at', after)
    } else {
      // 일반적인 페이지네이션
      query = query.limit(limit).range(offset, offset + limit - 1)
    }
    
    const { data: messages, error: messagesError } = await query

    if (messagesError) {
      console.error('Messages query error:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // ====================================
    // 프론트엔드 호환성을 위한 형식 변환
    // ====================================
    const formattedMessages = (messages || []).map(msg => ({
      // 기본 필드
      id: msg.id,
      webhook_type: 'message',
      message_id: msg.original_message_id,
      message_text: msg.message_text,
      message_timestamp: new Date(msg.message_timestamp).getTime(), // epoch milliseconds
      sender_id: msg.sender_id,
      recipient_id: msg.recipient_id,
      is_echo: msg.sender_type === 'business',
      attachments: msg.attachments,
      created_at: msg.created_at,
      
      // 추가 메타데이터
      raw_data: {
        platform: msg.platform,
        sender_type: msg.sender_type,
        message_type: msg.message_type,
        conversation_id: msg.conversation_id
      }
    }))

    // ====================================
    // unread_count 리셋 (0이 아닌 경우만)
    // ====================================
    if (conversationData.unread_count > 0) {
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationData.id)
    }

    // LINE processed 상태 업데이트 (LINE인 경우만)
    if (conversationData.platform === 'line') {
      await supabase
        .from('line_webhooks')
        .update({ processed: true, processed_at: new Date() })
        .eq('user_id', conversation_id)
        .eq('processed', false)
    }

    return NextResponse.json(formattedMessages)
  } catch (error) {
    console.error('Error in messages API:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}