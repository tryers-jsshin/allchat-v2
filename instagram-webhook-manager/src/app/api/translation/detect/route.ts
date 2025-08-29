import { NextRequest, NextResponse } from 'next/server'
import { getDeepLClient } from '@/lib/deepl-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const client = getDeepLClient()
    const startTime = Date.now()
    
    const detectedLanguage = await client.detectLanguage(text)
    
    const responseTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      detectedLanguage,
      responseTime,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Language detection failed' 
      },
      { status: 500 }
    )
  }
}