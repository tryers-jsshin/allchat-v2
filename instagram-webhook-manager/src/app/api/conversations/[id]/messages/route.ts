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

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // conversation_id를 participant IDs로 분해
    const [participant1, participant2] = conversation_id.split('_')
    
    if (!participant1 || !participant2) {
      return NextResponse.json({ error: 'Invalid conversation ID format' }, { status: 400 })
    }

    // 해당 대화의 최신 메시지부터 조회 (read 타입 제외)
    const { data: messages, error } = await supabase
      .from('instagram_webhooks')
      .select('*')
      .or(`and(sender_id.eq.${participant1},recipient_id.eq.${participant2}),and(sender_id.eq.${participant2},recipient_id.eq.${participant1})`)
      .neq('webhook_type', 'read')  // read 타입 메시지 제외
      .order('message_timestamp', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // 대화방의 읽지 않은 메시지 수를 0으로 리셋 (선택적)
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversation_id)

    return NextResponse.json(messages || [])
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}