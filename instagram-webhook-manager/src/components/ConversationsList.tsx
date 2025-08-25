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

  useEffect(() => {
    fetchConversations()
    
    // Realtime subscription
    const channel = supabase
      .channel('conversations-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations' 
        },
        (payload) => {
          console.log('Conversation update:', payload)
          if (payload.eventType === 'INSERT') {
            // 새 대화가 추가되면 전체 리스트 새로고침
            fetchConversations()
          } else if (payload.eventType === 'UPDATE') {
            // 기존 대화 업데이트는 로컬에서 처리
            const updatedConversation = payload.new as Conversation
            setConversations(prev => 
              prev.map(conv => 
                conv.conversation_id === updatedConversation.conversation_id 
                  ? { ...conv, ...updatedConversation, customer_profile: conv.customer_profile }
                  : conv
              )
            )
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
        setConversations(data)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
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
      new: { color: 'bg-blue-100 text-blue-800', label: '신규' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', label: '진행중' },
      waiting_customer: { color: 'bg-purple-100 text-purple-800', label: '고객 대기' },
      waiting_agent: { color: 'bg-orange-100 text-orange-800', label: '답변 대기' },
      resolved: { color: 'bg-green-100 text-green-800', label: '해결' },
      closed: { color: 'bg-gray-100 text-gray-800', label: '종료' },
      spam: { color: 'bg-red-100 text-red-800', label: '스팸' }
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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">대화 목록</h2>
        
        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            활성
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'resolved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            해결됨
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
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedConversationId === conversation.conversation_id
                  ? 'bg-blue-50 border-l-4 border-l-blue-600'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
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

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.customer_profile?.name || 
                         conversation.customer_profile?.username || 
                         conversation.customer_id}
                      </p>
                      {conversation.customer_profile?.is_verified_user && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 truncate mb-2">
                    {conversation.last_sender_id === conversation.business_account_id && (
                      <span className="text-blue-600">나: </span>
                    )}
                    {conversation.last_message_text || 'No messages'}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(conversation.status)}
                      {conversation.priority > 0 && (
                        <span className="text-xs text-red-600">
                          {conversation.priority === 2 ? '🔥 긴급' : '⚡ 높음'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {conversation.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                      {conversation.total_messages && (
                        <span className="text-xs text-gray-400">
                          {conversation.total_messages} msgs
                        </span>
                      )}
                    </div>
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