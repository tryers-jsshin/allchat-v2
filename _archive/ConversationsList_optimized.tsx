'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Conversation {
  id: string
  conversation_id: string
  participant_1_id: string
  participant_2_id: string
  business_account_id: string
  customer_id: string
  status: string
  status_updated_at: string
  assigned_to: string | null
  last_message_at: string
  last_message_text: string
  last_message_type: string
  last_sender_id: string
  unread_count: number
  notes: string | null
  tags: string[] | null
  priority: number
  created_at: string
  updated_at: string
  message_count: number
  platform?: string
  customer_profile?: {
    igsid: string
    name: string
    username: string | null
    profile_pic: string | null
    is_verified_user: boolean
    follower_count: number | null
  } | null
  total_messages: number
}

interface StatusCounts {
  all: number
  in_progress: number
  completed: number
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('in_progress')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    in_progress: 0,
    completed: 0
  })
  
  // 상태 필터 변경 추적을 위한 ref
  const statusFilterRef = useRef(statusFilter)
  statusFilterRef.current = statusFilter

  // 상태 카운트 조회
  const fetchStatusCounts = async () => {
    try {
      const response = await fetch('/api/conversations/status-counts')
      if (response.ok) {
        const counts = await response.json()
        setStatusCounts({
          all: counts.total_count || 0,
          in_progress: counts.in_progress_count || 0,
          completed: counts.completed_count || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch status counts:', error)
    }
  }

  // 실시간 업데이트 설정 (최적화된 버전)
  useEffect(() => {
    console.log('[ConversationsList] Setting up realtime subscription')

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedConversation = payload.new as any
            const oldConversation = payload.old as any
            
            console.log('[ConversationsList] Realtime UPDATE received:', {
              platform: updatedConversation.platform,
              conversation_id: updatedConversation.platform_conversation_id,
              old_status: oldConversation?.status,
              new_status: updatedConversation.status,
              old_unread: oldConversation?.unread_count,
              new_unread: updatedConversation.unread_count
            })

            // ========================================
            // 최적화: Realtime 데이터 직접 사용
            // API 호출 없이 바로 UI 업데이트
            // ========================================
            
            // 상태 변경 시 카운트 직접 업데이트
            if (oldConversation?.status !== updatedConversation.status) {
              setStatusCounts(prev => {
                const newCounts = {...prev}
                
                // 이전 상태에서 카운트 감소
                if (oldConversation?.status === 'in_progress') {
                  newCounts.in_progress = Math.max(0, newCounts.in_progress - 1)
                } else if (oldConversation?.status === 'completed') {
                  newCounts.completed = Math.max(0, newCounts.completed - 1)
                }
                
                // 새 상태에서 카운트 증가
                if (updatedConversation.status === 'in_progress') {
                  newCounts.in_progress++
                } else if (updatedConversation.status === 'completed') {
                  newCounts.completed++
                }
                
                return newCounts
              })
            }

            // 현재 필터에 표시되어야 하는지 확인
            const shouldBeVisible = 
              statusFilterRef.current === 'all' ||
              (statusFilterRef.current === 'in_progress' && updatedConversation.status === 'in_progress') ||
              (statusFilterRef.current === 'completed' && updatedConversation.status === 'completed')

            // 대화 목록 직접 업데이트
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => 
                c.conversation_id === updatedConversation.platform_conversation_id
              )
              
              if (shouldBeVisible) {
                // Realtime 데이터를 기존 형식으로 변환
                const formattedConversation: Conversation = {
                  id: updatedConversation.id,
                  conversation_id: updatedConversation.platform_conversation_id,
                  participant_1_id: updatedConversation.platform_data?.participant_1_id || '',
                  participant_2_id: updatedConversation.platform_data?.participant_2_id || '',
                  business_account_id: updatedConversation.business_account_id,
                  customer_id: updatedConversation.customer_id,
                  status: updatedConversation.status,
                  status_updated_at: updatedConversation.updated_at,
                  assigned_to: updatedConversation.platform_data?.assigned_to,
                  last_message_at: updatedConversation.last_message_at,
                  last_message_text: updatedConversation.last_message_text,
                  last_message_type: updatedConversation.last_message_type,
                  last_sender_id: updatedConversation.last_sender_id,
                  unread_count: updatedConversation.unread_count,
                  notes: updatedConversation.platform_data?.notes,
                  tags: updatedConversation.platform_data?.tags,
                  priority: updatedConversation.platform_data?.priority || 0,
                  created_at: updatedConversation.created_at,
                  updated_at: updatedConversation.updated_at,
                  message_count: updatedConversation.message_count,
                  platform: updatedConversation.platform,
                  customer_profile: updatedConversation.customer_name ? {
                    igsid: updatedConversation.customer_id,
                    name: updatedConversation.customer_name,
                    username: updatedConversation.platform_data?.username || null,
                    profile_pic: updatedConversation.customer_profile_pic,
                    is_verified_user: updatedConversation.customer_is_verified,
                    follower_count: updatedConversation.platform_data?.follower_count || null
                  } : (existingIndex >= 0 ? prev[existingIndex].customer_profile : null),
                  total_messages: updatedConversation.message_count || 0
                }

                if (existingIndex >= 0) {
                  // 기존 대화 업데이트
                  const updated = [...prev]
                  updated[existingIndex] = {
                    ...prev[existingIndex],
                    ...formattedConversation,
                    // 프로필 정보는 기존 것 유지 (없으면)
                    customer_profile: formattedConversation.customer_profile || prev[existingIndex].customer_profile
                  }
                  // 시간순 정렬
                  return updated.sort((a, b) => 
                    new Date(b.last_message_at || b.updated_at).getTime() - 
                    new Date(a.last_message_at || a.updated_at).getTime()
                  )
                } else {
                  // 새로운 대화 추가 (상태 변경으로 필터에 포함된 경우)
                  const newList = [formattedConversation, ...prev]
                  // 시간순 정렬
                  return newList.sort((a, b) => 
                    new Date(b.last_message_at || b.updated_at).getTime() - 
                    new Date(a.last_message_at || a.updated_at).getTime()
                  )
                }
              } else {
                // 필터에서 제외되어야 하는 경우
                if (existingIndex >= 0) {
                  return prev.filter((_, index) => index !== existingIndex)
                }
                return prev
              }
            })
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

  // 상태 필터 변경 시 대화 목록 다시 불러오기
  useEffect(() => {
    fetchConversations()
  }, [statusFilter])

  // 초기 로드 시 상태 카운트 조회
  useEffect(() => {
    fetchStatusCounts()
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } else if (days === 1) {
      return '어제'
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'numeric', 
        day: 'numeric' 
      })
    }
  }

  const truncateText = (text: string, maxLength: number = 40) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'in_progress':
        return 'border-l-blue-500'
      case 'completed':
        return 'bg-gray-50'
      default:
        return 'border-l-orange-500'
    }
  }

  const getPlatformIcon = (platform?: string) => {
    switch(platform) {
      case 'instagram':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
          </svg>
        )
      case 'line':
        return (
          <Image
            src="/line-logo.svg"
            alt="LINE"
            width={16}
            height={16}
            className="rounded"
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 상태 필터 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              statusFilter === 'in_progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            진행 중
            {statusCounts.in_progress > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                {statusCounts.in_progress}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              statusFilter === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {statusCounts.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              statusFilter === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            완료
            {statusCounts.completed > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {statusCounts.completed}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 대화 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {statusFilter === 'in_progress' && '진행 중인 대화가 없습니다'}
            {statusFilter === 'completed' && '완료된 대화가 없습니다'}
            {statusFilter === 'all' && '대화가 없습니다'}
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              onClick={() => onSelectConversation(conversation)}
              className={`flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer border-l-4 transition-colors ${
                getStatusColor(conversation.status)
              } ${
                selectedConversationId === conversation.conversation_id
                  ? 'bg-blue-50'
                  : ''
              }`}
            >
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0">
                {conversation.customer_profile?.profile_pic ? (
                  <Image
                    src={conversation.customer_profile.profile_pic}
                    alt={conversation.customer_profile?.name || 'Profile'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">
                      {conversation.customer_profile?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>

              {/* 대화 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {conversation.customer_profile?.name || 
                       conversation.customer_profile?.username || 
                       'Unknown User'}
                    </span>
                    {getPlatformIcon(conversation.platform)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {conversation.last_message_at && formatTime(conversation.last_message_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {conversation.last_sender_id === conversation.business_account_id && (
                    <span className="text-blue-600 mr-1">나:</span>
                  )}
                  {truncateText(conversation.last_message_text || '메시지 없음')}
                </p>
              </div>

              {/* 읽지 않은 메시지 수 */}
              {conversation.unread_count > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}