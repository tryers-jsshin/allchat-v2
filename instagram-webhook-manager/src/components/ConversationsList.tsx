'use client'

import { useEffect, useState } from 'react'
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
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [statusCounts, setStatusCounts] = useState({
    active: 0,
    all: 0,
    completed: 0
  })

  useEffect(() => {
    fetchConversations()
    
    // Realtime subscription
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
            // 기존 대화 업데이트 시 시간순 재정렬
            const updatedConversation = payload.new as Conversation
            setConversations(prev => {
              const updated = prev.map(conv => 
                conv.conversation_id === updatedConversation.conversation_id 
                  ? { ...conv, ...updatedConversation, customer_profile: conv.customer_profile }
                  : conv
              )
              // 최신 메시지 시간 기준으로 재정렬
              return updated.sort((a, b) => 
                new Date(b.last_message_at || b.updated_at).getTime() - 
                new Date(a.last_message_at || a.updated_at).getTime()
              )
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [statusFilter])

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
        
        // 전체 대화방 수 계산 (필터와 상관없이 전체 데이터 필요)
        if (statusFilter !== 'all') {
          // 전체 카운트를 위해 별도 요청
          const allResponse = await fetch('/api/conversations?status=all')
          if (allResponse.ok) {
            const allData = await allResponse.json()
            calculateStatusCounts(allData)
          }
        } else {
          calculateStatusCounts(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatusCounts = (allConversations: Conversation[]) => {
    const counts = {
      active: 0,
      all: allConversations.length,
      completed: 0
    }
    
    allConversations.forEach(conv => {
      if (conv.status === 'pending' || conv.status === 'in_progress') {
        counts.active++
      } else if (conv.status === 'completed') {
        counts.completed++
      }
    })
    
    setStatusCounts(counts)
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
            onClick={() => setStatusFilter('active')}
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-all relative ${
              statusFilter === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            진행 중
            <span className="ml-1.5 text-orange-500 font-semibold">{statusCounts.active}</span>
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