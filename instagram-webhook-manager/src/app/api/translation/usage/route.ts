import { NextRequest, NextResponse } from 'next/server'
import { getDeepLClient } from '@/lib/deepl-client'

export async function GET() {
  try {
    const client = getDeepLClient()
    const usage = await client.getUsage()
    
    const percentage = usage.character_limit > 0 
      ? (usage.character_count / usage.character_limit * 100).toFixed(2)
      : 0

    return NextResponse.json({
      success: true,
      usage,
      percentage,
      remaining: usage.character_limit - usage.character_count,
      planType: client.getPlanType(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage' 
      },
      { status: 500 }
    )
  }
}