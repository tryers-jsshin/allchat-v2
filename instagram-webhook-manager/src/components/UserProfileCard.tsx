'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id?: string
  igsid: string
  name?: string | null
  username?: string | null
  profile_pic?: string | null
  follower_count?: number
  is_verified_user?: boolean
  is_user_follow_business?: boolean
  is_business_follow_user?: boolean
  has_user_consent?: boolean
  last_fetched_at?: string
  cache_expires_at?: string
  fetch_error?: string | null
}

interface UserProfileCardProps {
  igsid: string
  className?: string
  showDetails?: boolean
  onProfileLoaded?: (profile: UserProfile) => void
}

export default function UserProfileCard({ 
  igsid, 
  className = '', 
  showDetails = true,
  onProfileLoaded 
}: UserProfileCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (igsid) {
      fetchProfile()
    }
  }, [igsid])

  const fetchProfile = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // 먼저 데이터베이스에서 캐시된 프로필 확인
      const { data: cachedProfile, error: dbError } = await supabase
        .from('instagram_user_profiles')
        .select('*')
        .eq('igsid', igsid)
        .single()

      if (cachedProfile && !forceRefresh) {
        // 캐시가 유효한지 확인
        const cacheExpiry = new Date(cachedProfile.cache_expires_at)
        const now = new Date()
        
        if (cacheExpiry > now && !cachedProfile.fetch_error) {
          setProfile(cachedProfile)
          onProfileLoaded?.(cachedProfile)
          setLoading(false)
          return
        }
      }

      // API에서 새로운 프로필 가져오기
      const response = await fetch(`/api/profiles/${igsid}${forceRefresh ? '?refresh=true' : ''}`)
      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'User consent required') {
          setError('사용자 동의 필요')
        } else if (data.error === 'User blocked') {
          setError('차단된 사용자')
        } else {
          setError(data.message || '프로필을 불러올 수 없습니다')
        }
        setProfile(null)
      } else {
        setProfile(data.profile)
        onProfileLoaded?.(data.profile)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError('프로필 로드 중 오류 발생')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchProfile(true)
  }

  const formatFollowerCount = (count?: number) => {
    if (!count) return '0'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">@{igsid}</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto p-1 hover:bg-gray-100 rounded"
            title="다시 시도"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="text-sm text-gray-500">프로필 정보 없음</div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${showDetails ? 'p-4' : 'p-3'} ${className}`}>
      <div className="flex items-start space-x-3">
        {/* 프로필 이미지 */}
        <div className="flex-shrink-0">
          {profile.profile_pic ? (
            <img
              src={profile.profile_pic}
              alt={profile.username || profile.name || 'Profile'}
              className={`${showDetails ? 'w-12 h-12' : 'w-10 h-10'} rounded-full object-cover`}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBjbGFzcz0idz02IGgtNiI+CiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTUuNzUgNmE0LjUgNC41IDAgMTEtOSAwIDQuNSA0LjUgMCAwMTkgMHpNNC41MDEgMjAuMTE4YTcuNSA3LjUgMCAwMTE0Ljk5OCAwQTE3LjkzMyAxNy45MzMgMCAwMTEyIDIxLjc1Yy0yLjY3NiAwLTUuMjE2LS41ODQtNy40OTktMS42MzJ6IiAvPgo8L3N2Zz4='
              }}
            />
          ) : (
            <div className={`${showDetails ? 'w-12 h-12' : 'w-10 h-10'} bg-gray-100 rounded-full flex items-center justify-center`}>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* 프로필 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {profile.name || profile.username || 'Unknown User'}
            </p>
            {profile.is_verified_user && (
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          
          {profile.username && profile.username !== profile.name && (
            <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
          )}

          {showDetails && (
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
              {/* 팔로워 수 */}
              {profile.follower_count !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {formatFollowerCount(profile.follower_count)}
                </span>
              )}

              {/* 팔로우 관계 */}
              <div className="flex items-center gap-2">
                {profile.is_user_follow_business && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                    팔로잉
                  </span>
                )}
                {profile.is_business_follow_user && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    맞팔로우
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 마지막 업데이트 시간 */}
          {showDetails && profile.last_fetched_at && (
            <p className="mt-1 text-xs text-gray-400">
              업데이트: {getRelativeTime(profile.last_fetched_at)}
            </p>
          )}
        </div>

        {/* 새로고침 버튼 */}
        {showDetails && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="프로필 새로고침"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}