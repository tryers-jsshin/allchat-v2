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

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Get translation settings for the conversation
    const { data, error } = await supabase
      .from('conversations')
      .select('translation_enabled, translation_target_lang')
      .eq('platform_conversation_id', conversation_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      translation_enabled: data.translation_enabled || false,
      translation_target_lang: data.translation_target_lang || null
    })
  } catch (error) {
    console.error('Error fetching translation settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch translation settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversation_id } = await params
    const body = await request.json()
    const { translation_enabled, translation_target_lang } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Validate input
    if (typeof translation_enabled !== 'boolean') {
      return NextResponse.json({ error: 'translation_enabled must be a boolean' }, { status: 400 })
    }

    // If enabled but no language selected, disable it
    const finalEnabled = translation_enabled && translation_target_lang ? true : false

    // Update translation settings
    const { data, error } = await supabase
      .from('conversations')
      .update({
        translation_enabled: finalEnabled,
        translation_target_lang: finalEnabled ? translation_target_lang : null,
        updated_at: new Date().toISOString()
      })
      .eq('platform_conversation_id', conversation_id)
      .select('translation_enabled, translation_target_lang')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      translation_enabled: data.translation_enabled,
      translation_target_lang: data.translation_target_lang
    })
  } catch (error) {
    console.error('Error updating translation settings:', error)
    return NextResponse.json(
      { error: 'Failed to update translation settings' },
      { status: 500 }
    )
  }
}