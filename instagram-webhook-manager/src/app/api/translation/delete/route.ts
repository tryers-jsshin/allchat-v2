import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, targetLang = 'KO' } = body

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Soft delete the translation
    const { data, error } = await supabase
      .from('translations')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .eq('target_lang', targetLang.toUpperCase())
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      // 번역이 없는 경우도 성공으로 처리
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          message: 'No translation found to delete'
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Translation deleted successfully'
    })
  } catch (error) {
    console.error('Delete translation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete translation' 
      },
      { status: 500 }
    )
  }
}