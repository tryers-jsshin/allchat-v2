import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 대화방 목록 조회 쿼리 (외래 키 없이 별도로 프로필 조회)
    let query = supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // 상태 필터링
    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.in('status', ['new', 'in_progress', 'waiting_customer', 'waiting_agent'])
      } else {
        query = query.eq('status', status)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // 각 대화방에 대해 프로필과 메시지 수 가져오기
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conv) => {
        // 프로필 가져오기
        const { data: profile } = await supabase
          .from('instagram_user_profiles')
          .select('igsid, name, username, profile_pic, is_verified_user, follower_count')
          .eq('igsid', conv.customer_id)
          .single()
        
        // 메시지 수 계산
        const { count } = await supabase
          .from('instagram_webhooks')
          .select('*', { count: 'exact', head: true })
          .or(`and(sender_id.eq.${conv.customer_id},recipient_id.eq.${conv.business_account_id}),and(sender_id.eq.${conv.business_account_id},recipient_id.eq.${conv.customer_id})`)
        
        return {
          ...conv,
          customer_profile: profile,
          total_messages: count || 0
        }
      })
    )

    return NextResponse.json(conversationsWithDetails)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 대화방 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversation_id, status, assigned_to, notes, tags, priority } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (status !== undefined) updateData.status = status
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (notes !== undefined) updateData.notes = notes
    if (tags !== undefined) updateData.tags = tags
    if (priority !== undefined) updateData.priority = priority

    const { data, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('conversation_id', conversation_id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}