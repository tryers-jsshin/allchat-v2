import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversation_id } = await params
    const body = await request.json()
    const { status } = body

    if (!conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Valid status values
    const validStatuses = ['pending', 'in_progress', 'completed', 'spam']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Update conversation status in instagram_conversations table
    const { data, error } = await supabase
      .from('instagram_conversations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', conversation_id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update conversation status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error updating conversation status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}