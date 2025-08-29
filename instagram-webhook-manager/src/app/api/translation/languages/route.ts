import { NextRequest, NextResponse } from 'next/server'
import { getDeepLClient } from '@/lib/deepl-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'both'

    const client = getDeepLClient()
    
    let sourceLanguages = []
    let targetLanguages = []

    if (type === 'source' || type === 'both') {
      sourceLanguages = await client.getSourceLanguages()
    }

    if (type === 'target' || type === 'both') {
      targetLanguages = await client.getTargetLanguages()
    }

    return NextResponse.json({
      success: true,
      sourceLanguages,
      targetLanguages,
      counts: {
        source: sourceLanguages.length,
        target: targetLanguages.length
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch languages' 
      },
      { status: 500 }
    )
  }
}