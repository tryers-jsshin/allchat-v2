import { NextRequest, NextResponse } from 'next/server'
import { getDeepLClient } from '@/lib/deepl-client'

export async function GET() {
  try {
    const client = getDeepLClient()
    const result = await client.testConnection()
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test connection' 
      },
      { status: 500 }
    )
  }
}