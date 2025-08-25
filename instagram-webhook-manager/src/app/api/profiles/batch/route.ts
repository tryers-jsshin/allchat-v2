import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v23.0'
const CACHE_DURATION_HOURS = 24

// 배치 프로필 가져오기
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
          
          const profileRecord = {
            igsid,
            name: data.name || null,
            username: data.username || null,
            profile_pic: data.profile_pic || null,
            profile_pic_updated_at: data.profile_pic ? now.toISOString() : null,
            follower_count: data.follower_count || 0,
            is_verified_user: data.is_verified_user || false,
            is_user_follow_business: data.is_user_follow_business || false,
            is_business_follow_user: data.is_business_follow_user || false,
            has_user_consent: true,
            consent_granted_at: now.toISOString(),
            raw_profile_data: data,
            updated_at: now.toISOString(),
            last_fetched_at: now.toISOString(),
            cache_expires_at: cacheExpiresAt.toISOString(),
            fetch_error: null
          }
          
          await supabase
            .from('instagram_user_profiles')
            .upsert(profileRecord, {
              onConflict: 'igsid'
            })
          
          return { igsid, ...data, source: 'api' }
        } else {
          // 에러 처리
          console.error(`Failed to fetch profile for ${igsid}:`, data)
          
          // 에러 상태 저장
          await supabase
            .from('instagram_user_profiles')
            .upsert({
              igsid,
              fetch_error: data.error?.message || 'Unknown error',
              updated_at: now.toISOString(),
              last_fetched_at: now.toISOString()
            }, {
              onConflict: 'igsid'
            })
          
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