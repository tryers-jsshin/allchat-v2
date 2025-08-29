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
  platform?: string  // 플랫폼 추가
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
  // fetchConversations 디바운스를 위한 ref
  const fetchDebounceRef = useRef<NodeJS.Timeout>()
  // 이전 상태 추적을 위한 ref (Supabase realtime이 old 값을 제대로 안 주는 문제 대응)
  const conversationStatesRef = useRef<Map<string, string>>(new Map())

  // statusFilter 변경 시 데이터 다시 가져오기 (초기 로드 포함)
  useEffect(() => {
    console.log('[ConversationsList] useEffect triggered - statusFilter:', statusFilter)
    statusFilterRef.current = statusFilter  // ref 업데이트
    fetchConversations()
    // fetchStatusCounts() 제거 - 탭 변경 시마다 카운트를 다시 가져올 필요 없음
  }, [statusFilter])
  
  // 초기 로드 시 한 번만 status counts 가져오기
  useEffect(() => {
    fetchStatusCounts()
  }, [])  // 빈 배열 - 컴포넌트 마운트 시 한 번만

  // Realtime subscription - statusFilter와 독립적으로 설정
  useEffect(() => {
    const channel = supabase
      .channel('unified-conversations-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations'  // 통합 테이블 구독
        },
        async (payload) => {
          console.log('Conversation update:', payload)
          if (payload.eventType === 'INSERT') {
            const newConversation = payload.new as any  // conversations 테이블 구조
            
            // 현재 필터에 표시되어야 하는지 확인
            const shouldBeVisible = 
              statusFilterRef.current === 'all' ||
              (statusFilterRef.current === 'in_progress' && newConversation.status === 'in_progress') ||
              (statusFilterRef.current === 'completed' && newConversation.status === 'completed')
              
            if (!shouldBeVisible) return
            
            // 전체 대화 목록 다시 불러오기 (프로필 정보 포함)
            fetchConversations()
          } else if (payload.eventType === 'UPDATE') {
            // conversations 테이블 업데이트 시
            const updatedConversation = payload.new as any
            const oldConversation = payload.old as any
            
            // 로컬에서 추적하던 이전 상태 가져오기
            const trackedOldStatus = conversationStatesRef.current.get(updatedConversation.platform_conversation_id)
            const actualOldStatus = oldConversation?.status || trackedOldStatus
            
            // UI에 영향을 주는 중요한 필드 변경 확인
            const hasImportantChange = 
              oldConversation?.last_message_text !== updatedConversation?.last_message_text ||
              actualOldStatus !== updatedConversation?.status
            
            // unread_count 변경은 메시지 텍스트가 같이 변경될 때만 처리
            // (단순 카운트만 변경된 경우는 무시)
            const isOnlyCountChange = 
              oldConversation?.last_message_text === updatedConversation?.last_message_text &&
              actualOldStatus === updatedConversation?.status &&
              oldConversation?.unread_count !== updatedConversation?.unread_count
            
            if (!hasImportantChange || isOnlyCountChange) {
              console.log('[ConversationsList] Skipping UPDATE:', {
                hasImportantChange,
                isOnlyCountChange,
                lastMessageChanged: oldConversation?.last_message_text !== updatedConversation?.last_message_text,
                statusChanged: actualOldStatus !== updatedConversation?.status,
                trackedOldStatus,
                newStatus: updatedConversation?.status
              })
              return // 중요하지 않은 변경은 무시
            }
            
            // 디버깅 로그
            console.log('[ConversationsList] Important UPDATE event received:', {
              old: oldConversation,
              new: updatedConversation,
              oldStatus: actualOldStatus,
              newStatus: updatedConversation?.status,
              trackedOldStatus
            })
            
            // 실제 상태 변경 확인 - 더 엄격한 체크 (completed → in_progress는 한 번만 처리)
            if (updatedConversation && actualOldStatus && updatedConversation.status &&
                actualOldStatus !== updatedConversation.status) {
              
              console.log('[ConversationsList] Status actually changed:', {
                from: oldConversation.status,
                to: updatedConversation.status
              })
              
              // API 호출 대신 직접 카운트 계산 (한 번만)
              setStatusCounts(prev => {
                const newCounts = {...prev}
                
                // 이전 상태에서 카운트 감소 (actualOldStatus 사용)
                if (actualOldStatus === 'in_progress') {
                  newCounts.in_progress = Math.max(0, newCounts.in_progress - 1)
                } else if (actualOldStatus === 'completed') {
                  newCounts.completed = Math.max(0, newCounts.completed - 1)
                }
                
                // 새 상태에서 카운트 증가
                if (updatedConversation.status === 'in_progress') {
                  newCounts.in_progress++
                } else if (updatedConversation.status === 'completed') {
                  newCounts.completed++
                }
                
                // all 카운트는 총합 유지 (변경 없음)
                return newCounts
              })
              
              // completed → in_progress 전환 시 처리
              if (actualOldStatus === 'completed' && updatedConversation.status === 'in_progress') {
                console.log('[ConversationsList] Status reopened from completed to in_progress')
                // 완료 탭에 있으면 리스트에서 제거만, 진행중 탭에 있으면 리스트 새로고침
                if (statusFilterRef.current === 'completed') {
                  // 완료 탭: 해당 대화를 리스트에서 제거
                  setConversations(prev => 
                    prev.filter(c => c.conversation_id !== updatedConversation.platform_conversation_id)
                  )
                } else if (statusFilterRef.current === 'in_progress' || statusFilterRef.current === 'all') {
                  // 진행중 또는 전체 탭: 리스트 새로고침
                  clearTimeout(fetchDebounceRef.current)
                  fetchConversations()
                }
                return // 이미 처리했으므로 아래 로직 스킵
              }
            }
            
            // 현재 필터에 표시되어야 하는지 확인
            const shouldBeVisible = 
              statusFilterRef.current === 'all' ||
              (statusFilterRef.current === 'in_progress' && updatedConversation.status === 'in_progress') ||
              (statusFilterRef.current === 'completed' && updatedConversation.status === 'completed')
            
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => c.conversation_id === updatedConversation.platform_conversation_id)
              
              if (shouldBeVisible) {
                if (existingIndex >= 0) {
                  // 기존 대화 업데이트
                  const updated = [...prev]
                  updated[existingIndex] = {
                    ...prev[existingIndex],
                    status: updatedConversation.status,
                    unread_count: updatedConversation.unread_count ?? prev[existingIndex].unread_count,
                    last_message_at: updatedConversation.last_message_at || prev[existingIndex].last_message_at,
                    last_message_text: updatedConversation.last_message_text || prev[existingIndex].last_message_text,
                    last_message_type: updatedConversation.last_message_type || prev[existingIndex].last_message_type,
                    last_sender_id: updatedConversation.last_sender_id || prev[existingIndex].last_sender_id,
                    updated_at: updatedConversation.updated_at
                  }
                  // 시간순 정렬
                  return updated.sort((a, b) => 
                    new Date(b.last_message_at || b.updated_at).getTime() - 
                    new Date(a.last_message_at || a.updated_at).getTime()
                  )
                } else {
                  // 새로 보여야 하는 경우 전체 리스트 다시 불러오기 (디바운스 적용)
                  clearTimeout(fetchDebounceRef.current)
                  fetchDebounceRef.current = setTimeout(() => {
                    console.log('[ConversationsList] Debounced fetchConversations called')
                    fetchConversations()
                  }, 500) // 500ms 대기
                  return prev
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
      // 클린업 시 디바운스 타이머도 정리
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current)
      }
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
        
        // 상태 추적 맵 업데이트
        conversationStatesRef.current.clear()
        sortedData.forEach((conv: Conversation) => {
          conversationStatesRef.current.set(conv.conversation_id, conv.status)
        })
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // 메시지 타입에 따른 표시 텍스트 반환
  const getMessageDisplay = (conversation: Conversation) => {
    // last_message_text가 있으면 우선 표시
    if (conversation.last_message_text) {
      return conversation.last_message_text
    }
    
    // last_message_type에 따른 표시
    switch (conversation.last_message_type) {
      case 'image':
        return '사진을 보냈습니다.'
      case 'video':
        return '동영상을 보냈습니다.'
      case 'audio':
        return '오디오를 보냈습니다.'
      case 'file':
        return '파일을 보냈습니다.'
      case 'sticker':
        return '스티커를 보냈습니다.'
      case 'location':
        return '위치를 보냈습니다.'
      case 'template':
        return '템플릿 메시지를 보냈습니다.'
      case 'media':
        return '미디어를 보냈습니다.'
      default:
        return '메시지 없음'
    }
  }

  const fetchStatusCounts = async () => {
    console.trace('[ConversationsList] fetchStatusCounts called')
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">고객 메시지</h2>
        
        {/* Status Filter */}
        <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`flex-1 px-4 py-1.5 rounded-md text-xs font-medium transition-all relative ${
              statusFilter === 'in_progress'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            진행 중
            <span className="ml-1 text-blue-500 font-semibold">{statusCounts.in_progress}</span>
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체
            <span className="ml-1 text-gray-500 font-semibold">{statusCounts.all}</span>
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`flex-1 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              statusFilter === 'completed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            완료
            <span className="ml-1 text-gray-500 font-semibold">{statusCounts.completed}</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
              className={`h-20 px-4 py-3 border-b border-gray-200 border-l-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedConversationId === conversation.conversation_id
                  ? 'bg-blue-50'
                  : ''
              } ${
                conversation.status === 'in_progress'
                  ? 'border-l-blue-500'
                  : conversation.status === 'completed'
                  ? 'border-l-gray-300'
                  : 'border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3 h-full">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  {conversation.customer_profile?.profile_pic ? (
                    <img
                      src={conversation.customer_profile.profile_pic}
                      alt={conversation.customer_profile.username || 'Profile'}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBjbGFzcz0idz02IGgtNiI+CiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMTUuNzUgNmE0LjUgNC41IDAgMTEtOSAwIDQuNSA0LjUgMCAwMTkgMHpNNC41MDEgMjAuMTE4YTcuNSA3LjUgMCAwMTE0Ljk5OCAwQTE3LjkzMyAxNy45MzMgMCAwMTEyIDIxLjc1Yy0yLjY3NiAwLTUuMjE2LS41ODQtNy40OTktMS42MzJ6IiAvPgo8L3N2Zz4='
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.customer_profile?.name || 
                         conversation.customer_profile?.username || 
                         conversation.customer_id}
                      </p>
                      {/* Platform Icon */}
                      <img 
                        src={conversation.platform === 'line' ? '/line-logo.svg' : '/instagram-logo.png'} 
                        alt={conversation.platform || 'instagram'} 
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
                  
                  {/* 하단 줄: 메시지 내용 | 뱃지 */}
                  <div className="flex items-start justify-between gap-2">
                    <p 
                      className="text-xs text-gray-600 flex-1 overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.3'
                      }}
                    >
                      {getMessageDisplay(conversation)}
                    </p>
                    <div className="min-w-[18px] flex-shrink-0 -mt-0.5">
                      {conversation.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
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