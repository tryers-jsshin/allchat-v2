'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase, WebhookRecord } from '@/lib/supabase'

interface ConversationViewProps {
  conversationId?: string
  businessAccountId?: string
  customerId?: string
  customerName?: string
}


export default function ConversationView({ 
  conversationId, 
  businessAccountId,
  customerId,
  customerName
}: ConversationViewProps) {
  const [messages, setMessages] = useState<WebhookRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      // 대화가 바뀌면 상태 초기화
      setMessages([])
      setOffset(0)
      setHasMore(true)
      fetchMessages(0, true)
      
      // Realtime subscription for new messages
      const [participant1, participant2] = conversationId.split('_')
      
      console.log('Setting up realtime subscription for:', {
        conversationId,
        participant1,
        participant2
      })
      
      // 더 간단한 구독 방식 - 필터 없이 모든 INSERT 받고 클라이언트에서 필터링
      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'instagram_webhooks'
          },
          (payload) => {
            console.log('🔔 New webhook received:', payload)
            const newMessage = payload.new as WebhookRecord
            
            // 클라이언트 측에서 필터링
            const isRelevant = 
              (newMessage.sender_id === participant1 && newMessage.recipient_id === participant2) ||
              (newMessage.sender_id === participant2 && newMessage.recipient_id === participant1)
            
            if (isRelevant) {
              console.log('✅ Message is relevant to this conversation')
              setMessages(prev => [...prev, newMessage])
              // 새 메시지가 추가되면 스크롤 (특히 echo 메시지)
              setTimeout(() => {
                scrollToBottom()
              }, 50)
            } else {
              console.log('❌ Message not relevant to this conversation')
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status)
        })

      return () => {
        console.log('Removing realtime channel')
        supabase.removeChannel(channel)
      }
    }
  }, [conversationId])

  // \uc0c1\ub2e8 \uc2a4\ud06c\ub864 \uac10\uc9c0\ub97c \uc704\ud55c useEffect
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // \uc0c1\ub2e8\uc5d0 \ub3c4\ub2ec\ud588\uc744 \ub54c (\uc2a4\ud06c\ub864 \uc704\uce58\uac00 100px \ubbf8\ub9cc\uc77c \ub54c)
      if (container.scrollTop < 100 && hasMore && !loadingMore && messages.length > 0) {
        fetchMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadingMore, messages.length, offset])

  const fetchMessages = async (customOffset?: number, isInitial: boolean = false) => {
    if (!conversationId || (loadingMore && !isInitial)) return
    
    const currentOffset = customOffset !== undefined ? customOffset : offset
    
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const response = await fetch(`/api/conversations/${conversationId}/messages?offset=${currentOffset}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        
        // 더 이상 메시지가 없으면
        if (data.length < 50) {
          setHasMore(false)
        }
        
        // API에서는 최신순으로 오므로, 화면 표시를 위해 다시 오래된 순으로 정렬
        const sortedData = data.sort((a: WebhookRecord, b: WebhookRecord) => {
          const timeA = a.message_timestamp || (a.created_at ? new Date(a.created_at).getTime() : 0)
          const timeB = b.message_timestamp || (b.created_at ? new Date(b.created_at).getTime() : 0)
          return timeA - timeB
        })
        
        if (isInitial) {
          setMessages(sortedData)
          // 메시지가 렌더링된 후 스크롤을 바로 하단으로 이동
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
              }
            }, 0)
          })
        } else {
          // 현재 스크롤 정보 저장
          const container = messagesContainerRef.current
          if (container) {
            const prevScrollHeight = container.scrollHeight
            const prevScrollTop = container.scrollTop
            
            // 기존 메시지 앞에 새로운 메시지 추가 (중복 제거)
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMessages = sortedData.filter((m: WebhookRecord) => !existingIds.has(m.id))
              return [...newMessages, ...prev]
            })
            
            // DOM 업데이트 후 스크롤 위치 복원
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  const newScrollHeight = messagesContainerRef.current.scrollHeight
                  const scrollHeightDiff = newScrollHeight - prevScrollHeight
                  // 새로 추가된 메시지 높이만큼 스크롤 위치 조정
                  messagesContainerRef.current.scrollTop = prevScrollTop + scrollHeightDiff
                }
              }, 0)
            })
          }
        }
        
        setOffset(currentOffset + data.length)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !customerId || sending) return

    const messageContent = messageText.trim()
    setSending(true)
    
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: customerId,
          messageType: 'text',
          content: messageContent
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`전송 실패: ${error.message || 'Unknown error'}`)
        setMessageText(messageContent) // 실패 시 메시지 복원
      } else {
        setMessageText('') // 성공 시에만 입력창 비우기
      }
    } catch (error) {
      console.error('Send error:', error)
      alert('메시지 전송 중 오류가 발생했습니다')
      setMessageText(messageContent) // 오류 시 메시지 복원
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!sending) { // 전송 중이 아닐 때만 전송
        sendMessage()
      }
    }
  }

  const formatTime = (timestamp?: number | string) => {
    if (!timestamp) return ''
    // Instagram 타임스탬프는 밀리초 단위
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp)
    
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return '날짜 없음'
    
    try {
      // Instagram 타임스탬프는 밀리초 단위
      const date = typeof timestamp === 'number' 
        ? new Date(timestamp) 
        : new Date(timestamp)
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return '날짜 없음'
      }
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Date formatting error:', error, timestamp)
      return '날짜 없음'
    }
  }

  const renderMessageContent = (message: WebhookRecord) => {
    // 텍스트 메시지
    if (message.message_text) {
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.message_text}
        </p>
      )
    }

    // 첨부파일
    if (message.attachments && message.attachments.length > 0) {
      return (
        <div className="space-y-2">
          {message.attachments.map((attachment: any, idx: number) => {
            if (attachment.type === 'image') {
              return (
                <img
                  key={idx}
                  src={attachment.payload?.url}
                  alt="Image attachment"
                  className="max-w-xs rounded-lg"
                />
              )
            } else if (attachment.type === 'video') {
              return (
                <video
                  key={idx}
                  src={attachment.payload?.url}
                  controls
                  className="max-w-xs rounded-lg"
                />
              )
            } else if (attachment.type === 'audio') {
              return (
                <audio
                  key={idx}
                  src={attachment.payload?.url}
                  controls
                  className="max-w-xs"
                />
              )
            } else {
              return (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                  <span className="text-2xl">📎</span>
                  <span className="text-sm">{attachment.type}</span>
                </div>
              )
            }
          })}
        </div>
      )
    }

    // 반응
    if (message.webhook_type === 'reaction') {
      return (
        <p className="text-sm italic text-gray-600">
          {message.reaction_action === 'react' 
            ? `${message.reaction_emoji || message.reaction_type} 반응 추가`
            : '반응 제거'}
        </p>
      )
    }

    // 포스트백
    if (message.webhook_type === 'postback') {
      return (
        <p className="text-sm">
          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800">
            버튼 클릭: {message.postback_title}
          </span>
        </p>
      )
    }

    // 읽음 확인
    if (message.webhook_type === 'read') {
      return (
        <p className="text-xs italic text-gray-500">
          ✓✓ 메시지 읽음
        </p>
      )
    }

    // 기타
    return (
      <p className="text-sm text-gray-500">
        {message.webhook_type} 메시지
      </p>
    )
  }

  // 날짜별로 메시지 그룹화
  const groupMessagesByDate = (messages: WebhookRecord[]) => {
    const groups: { [key: string]: WebhookRecord[] } = {}
    
    messages.forEach(message => {
      const date = formatDate(message.message_timestamp || message.created_at)
      // 디버깅용 로그
      if (!date || date === '' || date.includes('\\u')) {
        console.warn('Invalid date format:', {
          message_timestamp: message.message_timestamp,
          created_at: message.created_at,
          formatted: date
        })
      }
      
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">대화를 선택하세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900">
          {customerName || customerId || 'Unknown User'}
        </h3>
        <p className="text-sm text-gray-500">
          Instagram Direct Message
        </p>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            아직 메시지가 없습니다
          </div>
        ) : (
          <div className="space-y-4">
            {/* 이전 메시지 로딩 표시 */}
            {loadingMore && (
              <div className="flex justify-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {/* 더 이상 메시지가 없을 때 */}
            {!hasMore && messages.length > 0 && (
              <div className="text-center text-gray-500 text-sm py-2">
                대화의 시작입니다
              </div>
            )}
            
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {date}
                  </div>
                </div>

                {/* Messages for this date */}
                {dateMessages.map((message) => {
                  const isBusinessMessage = message.sender_id === businessAccountId || message.is_echo
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isBusinessMessage ? 'justify-end' : 'justify-start'} mb-3 group`}
                    >
                      <div className={`flex ${isBusinessMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-xs lg:max-w-md`}>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isBusinessMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {renderMessageContent(message)}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          {formatTime(message.message_timestamp || message.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={customerId ? "메시지를 입력하세요..." : "대화를 선택하세요"}
            disabled={!customerId}
            className={`flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !customerId ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
          />
          <button
            onClick={sendMessage}
            disabled={!customerId || !messageText.trim() || sending}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              !customerId || !messageText.trim() || sending
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {sending ? '전송 중...' : '전송'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter로 전송, Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  )
}