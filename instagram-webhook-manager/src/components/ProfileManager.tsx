'use client'

import { useEffect, useState } from 'react'
import { UserProfile, supabase } from '@/lib/supabase'
import UserProfileCard from './UserProfileCard'

export default function ProfileManager() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [filterVerified, setFilterVerified] = useState(false)
  const [filterFollowing, setFilterFollowing] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'followers' | 'messages'>('recent')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProfiles()
    
    // Realtime subscription for profile updates
    const channel = supabase
      .channel('profiles-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'instagram_user_profiles' 
        },
        (payload) => {
          console.log('Profile update:', payload)
          if (payload.eventType === 'INSERT') {
            setProfiles(prev => [payload.new as UserProfile, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setProfiles(prev => 
              prev.map(p => p.id === payload.new.id ? payload.new as UserProfile : p)
            )
          } else if (payload.eventType === 'DELETE') {
            setProfiles(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('instagram_user_profiles')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('Error fetching profiles:', error)
      } else {
        setProfiles(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBatchRefresh = async () => {
    const expiredProfiles = profiles.filter(p => {
      if (!p.cache_expires_at) return true
      return new Date(p.cache_expires_at) < new Date()
    })

    if (expiredProfiles.length === 0) {
      alert('모든 프로필이 최신 상태입니다')
      return
    }

    const igsids = expiredProfiles.map(p => p.igsid)
    
    try {
      const response = await fetch('/api/profiles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ igsids })
      })

      const data = await response.json()
      alert(`${data.summary.fetched}개 프로필이 업데이트되었습니다`)
      fetchProfiles()
    } catch (error) {
      console.error('Batch refresh error:', error)
      alert('프로필 업데이트 중 오류가 발생했습니다')
    }
  }

  const getFilteredProfiles = () => {
    let filtered = [...profiles]

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.igsid.includes(searchTerm)
      )
    }

    // 인증 계정 필터
    if (filterVerified) {
      filtered = filtered.filter(p => p.is_verified_user)
    }

    // 팔로잉 필터
    if (filterFollowing) {
      filtered = filtered.filter(p => p.is_user_follow_business)
    }

    // 정렬
    switch (sortBy) {
      case 'followers':
        filtered.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
        break
      case 'messages':
        filtered.sort((a, b) => (b.total_messages || 0) - (a.total_messages || 0))
        break
      case 'recent':
      default:
        filtered.sort((a, b) => {
          const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
          return bTime - aTime
        })
    }

    return filtered
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = {
    total: profiles.length,
    verified: profiles.filter(p => p.is_verified_user).length,
    following: profiles.filter(p => p.is_user_follow_business).length,
    followedBy: profiles.filter(p => p.is_business_follow_user).length,
    expired: profiles.filter(p => {
      if (!p.cache_expires_at) return true
      return new Date(p.cache_expires_at) < new Date()
    }).length
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">사용자 프로필 관리</h1>
        <p className="text-gray-600 mt-2">Instagram 사용자 프로필 정보를 관리하고 모니터링합니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">전체 프로필</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">인증 계정</p>
          <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">팔로잉</p>
          <p className="text-2xl font-bold text-green-600">{stats.following}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">팔로워</p>
          <p className="text-2xl font-bold text-purple-600">{stats.followedBy}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">업데이트 필요</p>
          <p className="text-2xl font-bold text-orange-600">{stats.expired}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="이름, 사용자명, ID로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Filters */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterVerified}
              onChange={(e) => setFilterVerified(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm">인증 계정만</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterFollowing}
              onChange={(e) => setFilterFollowing(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm">팔로잉만</span>
          </label>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">최근 메시지순</option>
            <option value="followers">팔로워순</option>
            <option value="messages">메시지 수순</option>
          </select>

          {/* Actions */}
          <button
            onClick={handleBatchRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            만료된 프로필 업데이트 ({stats.expired})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                프로필 목록 ({getFilteredProfiles().length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {getFilteredProfiles().length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  프로필이 없습니다
                </div>
              ) : (
                getFilteredProfiles().map((profile) => (
                  <div
                    key={profile.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedProfile?.id === profile.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <UserProfileCard 
                      igsid={profile.igsid} 
                      showDetails={false}
                      className="!shadow-none"
                    />
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>메시지: {profile.total_messages || 0}</span>
                      <span>마지막 메시지: {formatDate(profile.last_message_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">프로필 상세</h2>
            </div>
            <div className="p-4">
              {selectedProfile ? (
                <div className="space-y-4">
                  <UserProfileCard 
                    igsid={selectedProfile.igsid} 
                    showDetails={true}
                    className="border border-gray-200"
                  />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">IGSID:</span>
                      <p className="font-mono text-xs">{selectedProfile.igsid}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">총 메시지:</span>
                      <p>{selectedProfile.total_messages || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">첫 메시지:</span>
                      <p>{formatDate(selectedProfile.first_message_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">마지막 메시지:</span>
                      <p>{formatDate(selectedProfile.last_message_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">캐시 만료:</span>
                      <p className={new Date(selectedProfile.cache_expires_at!) < new Date() ? 'text-red-600' : ''}>
                        {formatDate(selectedProfile.cache_expires_at)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">API 호출 횟수:</span>
                      <p>{selectedProfile.fetch_count || 0}</p>
                    </div>
                  </div>

                  {selectedProfile.fetch_error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>에러:</strong> {selectedProfile.fetch_error}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      메모
                    </label>
                    <textarea
                      value={selectedProfile.notes || ''}
                      onChange={async (e) => {
                        const newNotes = e.target.value
                        setSelectedProfile({ ...selectedProfile, notes: newNotes })
                        
                        // Save to database
                        await supabase
                          .from('instagram_user_profiles')
                          .update({ notes: newNotes })
                          .eq('id', selectedProfile.id)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="이 사용자에 대한 메모를 작성하세요..."
                    />
                  </div>

                  {/* Raw Data */}
                  {selectedProfile.raw_profile_data && (
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-gray-700">원본 데이터</summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(selectedProfile.raw_profile_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  프로필을 선택하여 상세 정보를 확인하세요
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}