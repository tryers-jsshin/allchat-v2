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
    const platform = searchParams.get('platform') || 'instagram' // 플랫폼 파라미터 추가
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 통합 테이블 사용: conversations_with_profiles view
    let query = supabase
      .from('conversations_with_profiles')
      .select('*')
      .eq('platform', platform) // 플랫폼 필터
      .order('last_message_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // 상태 필터링
    if (status && status !== 'all') {
      if (status === 'active' || status === 'pending' || status === 'in_progress') {
        // active와 pending은 레거시 지원, in_progress가 정확한 명칭
        query = query.eq('status', 'in_progress')
      } else if (status === 'completed') {
        query = query.eq('status', 'completed')
      } else {
        query = query.eq('status', status)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // 통합 테이블 형식을 기존 형식으로 변환 (하위 호환성)
    const conversationsWithDetails = (data || []).map((conv) => ({
      // 기존 필드 매핑
      id: conv.id,
      conversation_id: conv.platform_conversation_id,
      participant_1_id: conv.platform_data?.participant_1_id,
      participant_2_id: conv.platform_data?.participant_2_id,
      business_account_id: conv.business_account_id,
      customer_id: conv.customer_id,
      status: conv.status,
      status_updated_at: conv.updated_at,
      assigned_to: conv.platform_data?.assigned_to,
      last_message_at: conv.last_message_at,
      last_message_text: conv.last_message_text,
      last_message_type: conv.last_message_type,
      last_sender_id: conv.last_sender_id,
      unread_count: conv.unread_count,
      notes: conv.platform_data?.notes,
      tags: conv.platform_data?.tags,
      priority: conv.platform_data?.priority || 0,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      message_count: conv.message_count,
      
      // 플랫폼 정보 추가
      platform: conv.platform,
      
      // 프로필 정보
      customer_profile: conv.customer_name || conv.customer_username ? {
        igsid: conv.customer_id,
        name: conv.customer_name,
        username: conv.customer_username,
        profile_pic: conv.customer_profile_pic,
        is_verified_user: conv.customer_is_verified,
        follower_count: conv.customer_platform_data?.follower_count
      } : null,
      total_messages: conv.message_count || 0
    }))

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
      .from('instagram_conversations')
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