import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('instagram_webhooks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}