import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/webhook-utils'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified')
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.log('❌ Webhook verification failed')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256') || ''
    const appSecret = process.env.INSTAGRAM_APP_SECRET || ''

    // 서명 검증 로깅 추가
    console.log('🔐 Signature verification:', {
      hasSignature: !!signature,
      hasAppSecret: !!appSecret,
      signature: signature,
    })

    // 개발 환경에서는 서명 검증을 선택적으로 처리
    if (appSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, appSecret)
      
      if (!isValid) {
        console.error('❌ Invalid signature')
        console.error('Expected app secret:', appSecret)
        console.error('Received signature:', signature)
        console.error('Body:', body)
        // 개발 환경에서는 경고만 하고 계속 진행
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        } else {
          console.warn('⚠️ Signature verification failed, but continuing in development mode')
        }
      } else {
        console.log('✅ Signature verified successfully')
      }
    } else {
      console.warn('⚠️ No signature or app secret provided, skipping verification')
    }

    const payload = JSON.parse(body)
    console.log('📥 Webhook received:', JSON.stringify(payload, null, 2))

    const webhookData = parseWebhookPayload(payload)

    const { data, error } = await supabase
      .from('instagram_webhooks')
      .insert([webhookData])
      .select()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    console.log('✅ Webhook saved to database:', data)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}