import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform') // 플랫폼 파라미터 (선택적)
    
    // 플랫폼이 지정되지 않으면 모든 플랫폼의 카운트를 합산
    let counts = {
      active: 0,
      all: 0,
      completed: 0,
      pending: 0,
      in_progress: 0,
      spam: 0
    }
    
    if (platform) {
      // 특정 플랫폼만 카운트
      const { data, error } = await supabase
        .rpc('get_conversation_status_counts', { p_platform: platform })
        .single<{
          active_count: number
          total_count: number
          completed_count: number
          pending_count: number
          in_progress_count: number
        }>()
      
      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to fetch status counts' }, { status: 500 })
      }
      
      counts = {
        active: Number(data?.active_count) || 0,
        all: Number(data?.total_count) || 0,
        completed: Number(data?.completed_count) || 0,
        pending: Number(data?.pending_count) || 0,
        in_progress: Number(data?.in_progress_count) || 0,
        spam: 0
      }
    } else {
      // 모든 플랫폼 카운트 합산 (Instagram + LINE + 기타)
      const platforms = ['instagram', 'line']
      
      for (const plt of platforms) {
        const { data, error } = await supabase
          .rpc('get_conversation_status_counts', { p_platform: plt })
          .single<{
            active_count: number
            total_count: number
            completed_count: number
            pending_count: number
            in_progress_count: number
          }>()
        
        if (!error && data) {
          counts.active += Number(data.active_count) || 0
          counts.all += Number(data.total_count) || 0
          counts.completed += Number(data.completed_count) || 0
          counts.pending += Number(data.pending_count) || 0
          counts.in_progress += Number(data.in_progress_count) || 0
        }
      }
    }

    return NextResponse.json(counts)
  } catch (error) {
    console.error('Error fetching status counts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}