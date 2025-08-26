'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  igsid: string
  name?: string
  username?: string
  profile_pic?: string
  is_verified_user?: boolean
  follower_count?: number
}

interface Conversation {
  id: string
  conversation_id: string
  participant_1_id: string
  participant_2_id: string
  business_account_id: string
  customer_id: string
  status: string
  status_updated_at: string
  assigned_to?: string
  last_message_at?: string
  last_message_text?: string
  last_message_type?: string
  last_sender_id?: string
  unread_count: number
  notes?: string
  tags?: string[]
  priority: number
  created_at: string
  updated_at: string
  customer_profile?: UserProfile
  total_messages?: number
}

interface ConversationsListProps {
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: string
}

export default function ConversationsList({ 
  onSelectConversation, 
  selectedConversationId 
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('in_progress')
  const [statusCounts, setStatusCounts] = useState({
    in_progress: 0,
    all: 0,
    completed: 0
  })
  
  // statusFilter의 최신 값을 유지하기 위한 ref
  const statusFilterRef = useRef(statusFilter)

  // statusFilter 변경 시 데이터 다시 가져오기
  useEffect(() => {
    statusFilterRef.current = statusFilter  // ref 업데이트
    fetchConversations()
    fetchStatusCounts()
  }, [statusFilter])

  // Realtime subscription - statusFilter와 독립적으로 설정
  useEffect(() => {
    const channel = supabase
      .channel('instagram-conversations-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'instagram_conversations' 
        },
        async (payload) => {
          console.log('Conversation update:', payload)
          if (payload.eventType === 'INSERT') {
            const newConversation = payload.new as Conversation
            
            // 새 대화일 때 프로필 정보 즉시 가져오기
            try {
              const profileResponse = await fetch(`/api/profiles/${newConversation.customer_id}`)
              if (profileResponse.ok) {
                const profileData = await profileResponse.json()
                
                // 프로필 정보와 함께 대화 추가
                setConversations(prev => {
                  const exists = prev.some(c => c.conversation_id === newConversation.conversation_id)
                  if (exists) return prev
                  
                  return [{
                    ...newConversation,
                    id: newConversation.conversation_id,
                    customer_profile: profileData.profile || profileData,
                    total_messages: 1
                  }, ...prev].sort((a, b) => 
                    new Date(b.last_message_at || b.updated_at).getTime() - 
                    new Date(a.last_message_at || a.updated_at).getTime()
                  )
                })
              } else {
                // 프로필을 가져오지 못해도 대화는 추가
                setConversations(prev => {
                  const exists = prev.some(c => c.conversation_id === newConversation.conversation_id)
                  if (exists) return prev
                  
                  return [{
                    ...newConversation,
                    id: newConversation.conversation_id,
                    total_messages: 1
                  }, ...prev].sort((a, b) => 
                    new Date(b.last_message_at || b.updated_at).getTime() - 
                    new Date(a.last_message_at || a.updated_at).getTime()
                  )
                })
              }
            } catch (error) {
              console.error('Failed to fetch profile:', error)
              // 에러가 나도 대화는 추가
              setConversations(prev => {
                const exists = prev.some(c => c.conversation_id === newConversation.conversation_id)
                if (exists) return prev
                
                return [{
                  ...newConversation,
                  id: newConversation.conversation_id,
                  total_messages: 1
                }, ...prev].sort((a, b) => 
                  new Date(b.last_message_at || b.updated_at).getTime() - 
                  new Date(a.last_message_at || a.updated_at).getTime()
                )
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            // 기존 대화 업데이트 시 - 단순하게 처리
            const updatedConversation = payload.new as Conversation
            
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => c.conversation_id === updatedConversation.conversation_id)
              const existingConv = existingIndex >= 0 ? prev[existingIndex] : null
              
              // status가 undefined인 경우 기존 status 사용
              const currentStatus = updatedConversation.status || existingConv?.status
              const oldStatus = existingConv?.status
              
              // 상태가 실제로 변경되었는지 확인
              if (oldStatus && currentStatus && oldStatus !== currentStatus) {
                // DB에서 정확한 카운트 가져오기
                fetchStatusCounts()
              }
              
              // 현재 필터에 표시되어야 하는가? (ref에서 최신 값 사용)
              const shouldBeVisible = 
                statusFilterRef.current === 'all' ||
                (statusFilterRef.current === 'in_progress' && currentStatus === 'in_progress') ||
                (statusFilterRef.current === 'completed' && currentStatus === 'completed')
              
              if (shouldBeVisible) {
                // 보여야 하는 경우
                if (existingIndex >= 0) {
                  // 기존에 있던 대화 업데이트
                  const updated = [...prev]
                  updated[existingIndex] = {
                    ...prev[existingIndex],
                    status: updatedConversation.status || prev[existingIndex].status,  // status도 기존 값 유지
                    unread_count: updatedConversation.unread_count ?? prev[existingIndex].unread_count,
                    last_message_at: updatedConversation.last_message_at || prev[existingIndex].last_message_at,
                    last_message_text: updatedConversation.last_message_text || prev[existingIndex].last_message_text,
                    last_message_type: updatedConversation.last_message_type || prev[existingIndex].last_message_type,
                    last_sender_id: updatedConversation.last_sender_id || prev[existingIndex].last_sender_id,
                    updated_at: updatedConversation.updated_at || prev[existingIndex].updated_at
                  }
                  // 시간순 정렬
                  return updated.sort((a, b) => 
                    new Date(b.last_message_at || b.updated_at).getTime() - 
                    new Date(a.last_message_at || a.updated_at).getTime()
                  )
                } else {
                  // 새로 추가되어야 하는 경우 (예: 완료→진행중으로 변경되어 진행중 탭에 나타나야 함)
                  // 프로필 정보가 필요하므로 전체 리스트 다시 불러오기
                  fetchConversations()
                  return prev
                }
              } else {
                // 보이지 않아야 하는 경우 - 제거
                if (existingIndex >= 0) {
                  return prev.filter((_, index) => index !== existingIndex)
                }
                return prev
              }
            })
            
            // 상태 카운트는 필요시 업데이트 (탭 전환 시 자동으로 가져옴)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // 빈 dependency로 한 번만 설정

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/conversations?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        // 초기 로드 시에도 시간순 정렬
        const sortedData = data.sort((a: Conversation, b: Conversation) => 
          new Date(b.last_message_at || b.updated_at).getTime() - 
          new Date(a.last_message_at || a.updated_at).getTime()
        )
        setConversations(sortedData)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusCounts = async () => {
    try {
      const response = await fetch('/api/conversations/status-counts')
      if (response.ok) {
        const counts = await response.json()
        setStatusCounts({
          in_progress: counts.in_progress || counts.active || counts.pending || 0,  // active와 pending을 in_progress로 매핑
          all: counts.all || 0,
          completed: counts.completed || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch status counts:', error)
    }
  }


  const formatTime = (dateString?: string) => {
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
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-orange-100 text-orange-800', label: '대기' },
      in_progress: { color: 'bg-blue-100 text-blue-800', label: '진행중' },
      completed: { color: 'bg-green-100 text-green-800', label: '완료' }
    }
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">고객 메시지</h2>
        
        {/* Status Filter */}
        <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-all relative ${
              statusFilter === 'in_progress'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            진행 중
            <span className="ml-1.5 text-orange-500 font-semibold">{statusCounts.in_progress}</span>
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체
            <span className="ml-1.5 text-gray-500 font-semibold">{statusCounts.all}</span>
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              statusFilter === 'completed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            완료
            <span className="ml-1.5 text-gray-500 font-semibold">{statusCounts.completed}</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            대화가 없습니다
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={`p-4 border-b border-gray-100 border-l-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedConversationId === conversation.conversation_id
                  ? 'bg-blue-50 border-l-blue-600'
                  : 'border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  {conversation.customer_profile?.profile_pic ? (
                    <img
                      src={conversation.customer_profile.profile_pic}
                      alt={conversation.customer_profile.username || 'Profile'}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBjbGFzcz0idz02IGgtNiI+CiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTUuNzUgNmE0LjUgNC41IDAgMTEtOSAwIDQuNSA0LjUgMCAwMTkgMHpNNC41MDEgMjAuMTE4YTcuNSA3LjUgMCAwMTE0Ljk5OCAwQTE3LjkzMyAxNy45MzMgMCAwMTEyIDIxLjc1Yy0yLjY3NiAwLTUuMjE2LS41ODQtNy40OTktMS42MzJ6IiAvPgo8L3N2Zz4='
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Conversation Info - Center */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.customer_profile?.name || 
                         conversation.customer_profile?.username || 
                         conversation.customer_id}
                      </p>
                      {/* Instagram Icon */}
                      <img 
                        src="/instagram-logo.png" 
                        alt="Instagram" 
                        className="w-3.5 h-3.5 flex-shrink-0 object-contain"
                      />
                      {conversation.customer_profile?.is_verified_user && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 truncate flex-1">
                      {conversation.last_message_text || '메시지 없음'}
                    </p>
                    {conversation.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full ml-2 flex-shrink-0">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  )
}