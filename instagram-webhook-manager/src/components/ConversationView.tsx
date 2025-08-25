'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase, WebhookRecord } from '@/lib/supabase'

interface ConversationViewProps {
  conversationId?: string
  businessAccountId?: string
  customerId?: string
  customerName?: string
}

interface OptimisticMessage extends WebhookRecord {
  optimisticId?: string
  status?: 'pending' | 'sent' | 'failed'
}


export default function ConversationView({ 
  conversationId, 
  businessAccountId,
  customerId,
  customerName
}: ConversationViewProps) {
  const [messages, setMessages] = useState<OptimisticMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
            
            // 클라이언트 측에서 필터링 (read 타입 제외)
            if (newMessage.webhook_type === 'read') {
              console.log('⏭️ Skipping read webhook')
              return
            }
            
            const isRelevant = 
              (newMessage.sender_id === participant1 && newMessage.recipient_id === participant2) ||
              (newMessage.sender_id === participant2 && newMessage.recipient_id === participant1)
            
            if (isRelevant) {
              console.log('✅ Message is relevant to this conversation')
              
              // echo 메시지인 경우 낙관적 메시지를 대체
              if (newMessage.is_echo) {
                setMessages(prev => {
                  // 같은 텍스트의 낙관적 메시지 찾기 (pending 또는 sent 상태)
                  const optimisticIndex = prev.findIndex(msg => 
                    msg.optimisticId && // 낙관적 메시지인지 확인
                    (msg.status === 'pending' || msg.status === 'sent') &&
                    msg.message_text === newMessage.message_text &&
                    msg.sender_id === newMessage.sender_id
                  )
                  
                  if (optimisticIndex !== -1) {
                    // 낙관적 메시지를 실제 메시지로 대체
                    const newMessages = [...prev]
                    newMessages[optimisticIndex] = newMessage
                    return newMessages
                  }
                  // 매칭되는 낙관적 메시지가 없으면 추가하지 않음 (중복 방지)
                  console.warn('Echo message received but no matching optimistic message found:', newMessage)
                  return prev
                })
              } else {
                // 일반 메시지는 그냥 추가
                setMessages(prev => [...prev, newMessage])
              }
              
              // 새 메시지가 추가되면 스크롤
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

  const sendMessage = async (retryMessage?: OptimisticMessage) => {
    // 재시도가 아닌 경우 현재 입력창의 텍스트 사용
    let messageContent: string
    if (retryMessage) {
      messageContent = retryMessage.message_text || ''
    } else {
      // 현재 입력창 텍스트를 가져오고 즉시 비우기
      messageContent = messageText.trim()
      if (!messageContent) return
      setMessageText('') // 즉시 입력창 비우기
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
    
    if (!messageContent || !customerId) return

    const optimisticId = retryMessage?.optimisticId || `optimistic-${Date.now()}-${Math.random()}`
    
    if (!retryMessage) {
      // 새 메시지일 때만 낙관적 업데이트
      const optimisticMessage: OptimisticMessage = {
        id: optimisticId,
        optimisticId,
        webhook_type: 'message',
        sender_id: businessAccountId,
        recipient_id: customerId,
        message_text: messageContent,
        message_timestamp: Date.now(),
        is_echo: true,
        status: 'pending',
        created_at: new Date().toISOString(),
        raw_data: {},
        is_deleted: false,
        is_unsupported: false,
        processed: false
      }
      
      setMessages(prev => [...prev, optimisticMessage])
      setTimeout(() => scrollToBottom(), 50)
    } else {
      // 재시도일 때 상태만 업데이트
      setMessages(prev => prev.map(msg => 
        msg.optimisticId === optimisticId 
          ? { ...msg, status: 'pending' }
          : msg
      ))
    }
    
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
        throw new Error(`전송 실패: ${(await response.json()).message || 'Unknown error'}`)
      }
      
      // 성공 시 상태 업데이트 (나중에 echo 웹훅으로 대체됨)
      setMessages(prev => prev.map(msg => 
        msg.optimisticId === optimisticId 
          ? { ...msg, status: 'sent' }
          : msg
      ))
    } catch (error) {
      console.error('Send error:', error)
      // 실패 시 상태 업데이트
      setMessages(prev => prev.map(msg => 
        msg.optimisticId === optimisticId 
          ? { ...msg, status: 'failed' }
          : msg
      ))
    }
  }

  const retryMessage = (message: OptimisticMessage) => {
    sendMessage(message)
  }

  const deleteFailedMessage = (optimisticId: string) => {
    setMessages(prev => prev.filter(msg => msg.optimisticId !== optimisticId))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 입력 중(조합 중)이면 무시
    if (e.nativeEvent.isComposing) {
      return
    }
    
    // Enter는 줄바꿈으로 사용 (전송은 버튼 클릭으로만)
    // Shift+Enter, Ctrl+Enter 등 모든 Enter는 줄바꿈
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const lineHeight = 20 // Approximate line height for text-xs
      const maxLines = 3
      const maxHeight = lineHeight * maxLines
      
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }

  const formatTime = (timestamp?: number | string) => {
    if (!timestamp) return ''
    // Instagram 타임스탬프는 밀리초 단위
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp)
    
    // 오전/오후 형식으로 시간 표시
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours < 12 ? '오전' : '오후'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    
    return `${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`
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
      
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      // 오늘
      if (messageDate.getTime() === today.getTime()) {
        return '오늘'
      }
      
      // 어제
      if (messageDate.getTime() === yesterday.getTime()) {
        return '어제'
      }
      
      // 올해
      if (date.getFullYear() === now.getFullYear()) {
        return `${date.getMonth() + 1}월 ${date.getDate()}일`
      }
      
      // 작년 이전
      return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`
    } catch (error) {
      console.error('Date formatting error:', error, timestamp)
      return '날짜 없음'
    }
  }

  const renderMessageContent = (message: WebhookRecord) => {
    // 텍스트 메시지
    if (message.message_text) {
      return (
        <p className="text-xs whitespace-pre-wrap break-words">
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
                  <span className="text-xs">{attachment.type}</span>
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
        <p className="text-xs italic text-gray-600">
          {message.reaction_action === 'react' 
            ? `${message.reaction_emoji || message.reaction_type} 반응 추가`
            : '반응 제거'}
        </p>
      )
    }

    // 포스트백
    if (message.webhook_type === 'postback') {
      return (
        <p className="text-xs">
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
      <p className="text-xs text-gray-500">
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
          <p className="mt-2 text-xs text-gray-500">대화를 선택하세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h3 className="text-base font-semibold text-gray-900">
          {customerName || customerId || 'Unknown User'}
        </h3>
        <p className="text-xs text-gray-500">
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
              <div className="text-center text-gray-500 text-xs py-2">
                대화의 시작입니다
              </div>
            )}
            
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                    {date}
                  </div>
                </div>

                {/* Messages for this date */}
                {dateMessages.map((message, index) => {
                  const msg = message as OptimisticMessage
                  const isBusinessMessage = msg.sender_id === businessAccountId || msg.is_echo
                  
                  // 다음 메시지와 같은 분(minute)인지 확인
                  const nextMessage = dateMessages[index + 1] as OptimisticMessage | undefined
                  const currentTime = formatTime(msg.message_timestamp || msg.created_at)
                  const nextTime = nextMessage ? formatTime(nextMessage.message_timestamp || nextMessage.created_at) : null
                  const isSameMinuteAsNext = nextMessage && 
                    currentTime === nextTime && 
                    ((msg.sender_id === businessAccountId || msg.is_echo) === (nextMessage.sender_id === businessAccountId || nextMessage.is_echo))
                  
                  return (
                    <div
                      key={msg.optimisticId || msg.id}
                      className={`flex ${isBusinessMessage ? 'justify-end' : 'justify-start'} ${isSameMinuteAsNext ? 'mb-1' : 'mb-3'} group`}
                    >
                      <div className={`flex ${isBusinessMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-xs lg:max-w-md`}>
                        <div
                          className={`px-4 py-2 rounded-2xl relative ${
                            isBusinessMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          } ${msg.status === 'pending' ? 'opacity-70' : ''}`}
                        >
                          {renderMessageContent(msg)}
                          
                          {/* 전송 상태 표시 */}
                          {msg.status === 'failed' && (
                            <div className="absolute -right-20 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                onClick={() => retryMessage(msg)}
                                className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                                title="재전송"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteFailedMessage(msg.optimisticId!)}
                                className="p-1 rounded-full bg-gray-500 text-white hover:bg-gray-600"
                                title="삭제"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* 같은 시간대 그룹의 마지막 메시지에만 시간 표시 */}
                        {!isSameMinuteAsNext && (
                          <div className="text-[10px] text-gray-500 mb-1 whitespace-nowrap">
                            {formatTime(msg.message_timestamp || msg.created_at)}
                            {msg.status === 'pending' && ' • 전송 중...'}
                            {msg.status === 'failed' && ' • 실패'}
                          </div>
                        )}
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
        <div className="flex items-end gap-2">
          {/* File Attachment Button */}
          <button
            className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            title="파일 첨부 (준비 중)"
            disabled
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder={customerId ? "메시지를 입력하세요... (Enter로 줄바꿈)" : "대화를 선택하세요"}
            disabled={!customerId}
            rows={1}
            className={`flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !customerId ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
            style={{
              minHeight: '32px',
              maxHeight: '60px', // Approximately 3 lines
            }}
          />
          
          {/* Send Button */}
          <button
            onClick={() => {
              sendMessage()
              // Reset textarea height after sending
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
              }
            }}
            disabled={!customerId || !messageText.trim()}
            className={`px-4 py-1.5 text-xs rounded-full font-medium transition-colors ${
              !customerId || !messageText.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}