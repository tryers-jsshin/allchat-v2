import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v23.0'
const CACHE_DURATION_HOURS = 24

interface UserProfile {
  name?: string
  username?: string
  profile_pic?: string
  follower_count?: number
  is_verified_user?: boolean
  is_user_follow_business?: boolean
  is_business_follow_user?: boolean
}

interface ProfileError {
  error: {
    message: string
    type: string
    code: number
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ igsid: string }> }
) {
  try {
    const { igsid } = await params
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    if (!igsid) {
      return NextResponse.json(
        { error: 'IGSID is required' },
        { status: 400 }
      )
    }

    // 1. 캐시된 프로필 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      const { data: cachedProfile, error: cacheError } = await supabase
        .from('instagram_user_profiles')
        .select('*')
        .eq('igsid', igsid)
        .single()

      if (cachedProfile && !cacheError) {
        // 캐시가 유효한지 확인
        const cacheExpiry = new Date(cachedProfile.cache_expires_at)
        const now = new Date()
        
        if (cacheExpiry > now && !cachedProfile.fetch_error) {
          console.log(`✅ Returning cached profile for ${igsid}`)
          return NextResponse.json({
            source: 'cache',
            profile: cachedProfile,
            expires_at: cachedProfile.cache_expires_at
          })
        }
      }
    }

    // 2. Instagram API에서 프로필 가져오기
    const accessToken = process.env.INSTAGRAM_USER_ACCESS_TOKEN
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram access token not configured' },
        { status: 500 }
      )
    }

    // 요청할 필드들
    const fields = [
      'name',
      'username',
      'profile_pic',
      'follower_count',
      'is_verified_user',
      'is_user_follow_business',
      'is_business_follow_user'
    ].join(',')

    const profileUrl = `${INSTAGRAM_API_BASE}/${igsid}?fields=${fields}&access_token=${accessToken}`
    
    console.log(`📱 Fetching profile from Instagram API for ${igsid}`)
    
    const response = await fetch(profileUrl)
    const data = await response.json()

    // 3. 에러 처리
    if (!response.ok) {
      const errorData = data as ProfileError
      console.error('Instagram API error:', errorData)
      
      // 사용자 동의 부족 에러 처리
      if (errorData.error?.message?.includes('User consent is required')) {
        // 데이터베이스에 에러 상태 저장
        await supabase
          .from('instagram_user_profiles')
          .upsert({
            igsid,
            has_user_consent: false,
            fetch_error: 'User consent required',
            updated_at: new Date().toISOString(),
            last_fetched_at: new Date().toISOString()
          })
        
        return NextResponse.json(
          { 
            error: 'User consent required',
            message: '사용자가 먼저 메시지를 보내야 프로필을 조회할 수 있습니다.'
          },
          { status: 403 }
        )
      }

      // 차단된 사용자 에러 처리
      if (errorData.error?.message?.includes('blocked')) {
        await supabase
          .from('instagram_user_profiles')
          .upsert({
            igsid,
            is_active: false,
            fetch_error: 'User has blocked the business',
            updated_at: new Date().toISOString(),
            last_fetched_at: new Date().toISOString()
          })
        
        return NextResponse.json(
          { 
            error: 'User blocked',
            message: '사용자가 비즈니스 계정을 차단했습니다.'
          },
          { status: 403 }
        )
      }

      // 기타 에러
      return NextResponse.json(
        { 
          error: 'Failed to fetch profile',
          details: errorData.error
        },
        { status: response.status }
      )
    }

    // 4. 프로필 데이터 저장/업데이트
    const profileData = data as UserProfile
    const now = new Date()
    const cacheExpiresAt = new Date(now.getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000)
    
    const profileRecord = {
      igsid,
      name: profileData.name || null,
      username: profileData.username || null,
      profile_pic: profileData.profile_pic || null,
      profile_pic_updated_at: profileData.profile_pic ? now.toISOString() : null,
      follower_count: profileData.follower_count || 0,
      is_verified_user: profileData.is_verified_user || false,
      is_user_follow_business: profileData.is_user_follow_business || false,
      is_business_follow_user: profileData.is_business_follow_user || false,
      has_user_consent: true,
      consent_granted_at: now.toISOString(),
      raw_profile_data: profileData,
      updated_at: now.toISOString(),
      last_fetched_at: now.toISOString(),
      cache_expires_at: cacheExpiresAt.toISOString(),
      fetch_error: null,
      fetch_count: 1 // 증가시키기 위해 별도 쿼리 필요
    }

    // Upsert (insert or update) 프로필
    const { data: savedProfile, error: saveError } = await supabase
      .from('instagram_user_profiles')
      .upsert(profileRecord, {
        onConflict: 'igsid'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving profile:', saveError)
      // 저장 실패해도 가져온 데이터는 반환
      return NextResponse.json({
        source: 'api',
        profile: profileData,
        warning: 'Profile fetched but not cached'
      })
    }

    // fetch_count 증가 (수동으로 처리)
    if (savedProfile?.id) {
      try {
        await supabase
          .from('instagram_user_profiles')
          .update({ fetch_count: (savedProfile.fetch_count || 0) + 1 })
          .eq('id', savedProfile.id)
      } catch (err) {
        console.log('Could not increment fetch_count:', err)
      }
    }

    console.log(`✅ Profile saved/updated for ${igsid}`)

    return NextResponse.json({
      source: 'api',
      profile: savedProfile,
      expires_at: cacheExpiresAt.toISOString()
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 배치 프로필 가져오기 (POST 요청)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { igsids } = body

    if (!Array.isArray(igsids) || igsids.length === 0) {
      return NextResponse.json(
        { error: 'Array of IGSIDs is required' },
        { status: 400 }
      )
    }

    // 최대 50개까지만 허용
    if (igsids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 profiles can be fetched at once' },
        { status: 400 }
      )
    }

    const accessToken = process.env.INSTAGRAM_USER_ACCESS_TOKEN
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Instagram access token not configured' },
        { status: 500 }
      )
    }

    // 캐시된 프로필 먼저 확인
    const { data: cachedProfiles } = await supabase
      .from('instagram_user_profiles')
      .select('*')
      .in('igsid', igsids)

    const now = new Date()
    const validCachedProfiles = cachedProfiles?.filter(profile => {
      const cacheExpiry = new Date(profile.cache_expires_at)
      return cacheExpiry > now && !profile.fetch_error
    }) || []

    const cachedIgsids = validCachedProfiles.map(p => p.igsid)
    const uncachedIgsids = igsids.filter(id => !cachedIgsids.includes(id))

    // 캐시되지 않은 프로필들만 API에서 가져오기
    const fetchPromises = uncachedIgsids.map(async (igsid) => {
      const fields = 'name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user'
      const url = `${INSTAGRAM_API_BASE}/${igsid}?fields=${fields}&access_token=${accessToken}`
      
      try {
        const response = await fetch(url)
        const data = await response.json()
        
        if (response.ok) {
          // 성공적으로 가져온 프로필 저장
          const cacheExpiresAt = new Date(now.getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000)
          
          await supabase
            .from('instagram_user_profiles')
            .upsert({
              igsid,
              ...data,
              profile_pic_updated_at: data.profile_pic ? now.toISOString() : null,
              has_user_consent: true,
              consent_granted_at: now.toISOString(),
              raw_profile_data: data,
              updated_at: now.toISOString(),
              last_fetched_at: now.toISOString(),
              cache_expires_at: cacheExpiresAt.toISOString(),
              fetch_error: null
            })
          
          return { igsid, ...data, source: 'api' }
        } else {
          // 에러 처리
          console.error(`Failed to fetch profile for ${igsid}:`, data)
          return { igsid, error: data.error, source: 'error' }
        }
      } catch (error) {
        console.error(`Error fetching profile for ${igsid}:`, error)
        return { igsid, error: 'Network error', source: 'error' }
      }
    })

    const fetchedProfiles = await Promise.all(fetchPromises)

    // 모든 프로필 합치기
    const allProfiles = [
      ...validCachedProfiles.map(p => ({ ...p, source: 'cache' })),
      ...fetchedProfiles
    ]

    return NextResponse.json({
      profiles: allProfiles,
      summary: {
        requested: igsids.length,
        cached: validCachedProfiles.length,
        fetched: fetchedProfiles.filter(p => p.source === 'api').length,
        errors: fetchedProfiles.filter(p => p.source === 'error').length
      }
    })

  } catch (error) {
    console.error('Batch profile fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}