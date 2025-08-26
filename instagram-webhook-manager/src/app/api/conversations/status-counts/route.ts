import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform') || 'instagram'
    
    // 최적화된 함수 사용하여 카운트 가져오기
    const { data, error } = await supabase
      .rpc('get_conversation_status_counts', { p_platform: platform })
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch status counts' }, { status: 500 })
    }

    // API 응답 형식에 맞게 변환
    const counts = {
      active: Number(data.active_count) || 0,
      all: Number(data.total_count) || 0,
      completed: Number(data.completed_count) || 0,
      pending: Number(data.pending_count) || 0,
      in_progress: Number(data.in_progress_count) || 0,
      spam: 0 // 현재 spam 상태는 사용하지 않음
    }

    return NextResponse.json(counts)
  } catch (error) {
    console.error('Error fetching status counts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}