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

    // 프로필 가져오기 트리거 (비동기로 처리)
    if (webhookData.sender_id && webhookData.webhook_type === 'message' && !webhookData.is_echo) {
      // 사용자가 메시지를 보낸 경우에만 프로필 가져오기 (동의 획득)
      triggerProfileFetch(webhookData.sender_id).catch(err => {
        console.error('Profile fetch trigger error:', err)
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 프로필 가져오기를 비동기로 트리거
async function triggerProfileFetch(igsid: string) {
  try {
    console.log(`👤 Triggering profile fetch for ${igsid}`)
    
    // 내부 API 호출
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/profiles/${igsid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`Failed to fetch profile for ${igsid}:`, error)
      
      // 동의 부족 에러는 정상적인 상황
      if (error.error === 'User consent required') {
        console.log(`User consent not yet granted for ${igsid}`)
      }
    } else {
      const data = await response.json()
      console.log(`✅ Profile fetched for ${igsid}:`, data.profile?.username || 'unknown')
      
      // 프로필 ID를 webhook 레코드에 연결 (선택적)
      if (data.profile?.id) {
        await supabase
          .from('instagram_webhooks')
          .update({ sender_profile_id: data.profile.id })
          .eq('sender_id', igsid)
          .order('created_at', { ascending: false })
          .limit(1)
      }
    }
  } catch (error) {
    console.error(`Error in profile fetch trigger for ${igsid}:`, error)
  }
}