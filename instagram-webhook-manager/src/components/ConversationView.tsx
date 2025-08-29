'use client'

import { useEffect, useLayoutEffect, useState, useRef, useMemo, Fragment } from 'react'
import { supabase, WebhookRecord } from '@/lib/supabase'

interface ConversationViewProps {
  conversationId?: string
  businessAccountId?: string
  customerId?: string
  customerName?: string
  status?: string
  onStatusChange?: (newStatus: string) => void
  platform?: string  // 플랫폼 추가
  messagingWindowExpiresAt?: string  // 메시징 윈도우 만료 시간
}

interface OptimisticMessage extends WebhookRecord {
  optimisticId?: string
  status?: 'pending' | 'sent' | 'failed'
  failureReason?: 'MESSAGING_WINDOW_EXPIRED' | 'GENERAL_ERROR'
}


export default function ConversationView({ 
  conversationId, 
  businessAccountId,
  customerId,
  customerName,
  status = 'pending',
  onStatusChange,
  platform = 'instagram',
  messagingWindowExpiresAt
}: ConversationViewProps) {
  const [messages, setMessages] = useState<OptimisticMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentMessagingWindowExpiresAt, setCurrentMessagingWindowExpiresAt] = useState(messagingWindowExpiresAt)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 메시징 윈도우 상태 계산
  const messagingWindowStatus = useMemo(() => {
    // LINE은 메시징 윈도우 제한 없음
    if (platform === 'line') {
      return { canSend: true, reason: '제한 없음' }
    }
    
    // Instagram만 메시징 윈도우 체크
    if (!currentMessagingWindowExpiresAt) {
      // NULL인 경우에도 전송 허용
      return { canSend: true, reason: '메시지 전송 가능' }
    }
    
    const expiresAt = new Date(currentMessagingWindowExpiresAt)
    const now = new Date()
    const canSend = expiresAt > now
    
    if (!canSend) {
      return { 
        canSend: false, 
        expiresAt,
        reason: '24시간 메시징 윈도우가 만료됨'
      }
    }
    
    // 남은 시간 계산 (24시간 기준이므로 시간 단위로 표시)
    const hoursRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)) % 60
    
    return {
      canSend: true,
      expiresAt,
      hoursRemaining,
      minutesRemaining,
      reason: hoursRemaining > 0 ? `${hoursRemaining}시간 남음` : `${minutesRemaining}분 남음`
    }
  }, [currentMessagingWindowExpiresAt, platform])

  useEffect(() => {
    if (conversationId) {
      // 이전 fetch 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // 항상 새로 로드 (캐시 제거)
      setMessages([])
      setOffset(0)
      setHasMore(true)
      setIsFirstLoad(true)
      setCurrentStatus(status)
      fetchMessages(0, true)
      
      // 통합 messages 테이블 실시간 구독 설정
      let channel: any
      
      // async 함수로 래핑하여 conversation ID 가져오기
      const setupRealtimeSubscription = async () => {
        // conversations 테이블에서 실제 conversation ID와 최신 messaging_window_expires_at 가져오기
        const { data: conversationData } = await supabase
          .from('conversations')
          .select('id, messaging_window_expires_at')
          .eq('platform_conversation_id', conversationId)
          .single()
        
        let conversationsChannel
        
        if (conversationData) {
        // 최신 messaging_window_expires_at 값으로 state 업데이트
        if (conversationData.messaging_window_expires_at) {
          setCurrentMessagingWindowExpiresAt(conversationData.messaging_window_expires_at)
        }
        
        console.log('Setting up messages realtime subscription for:', {
          conversationId: conversationData.id,
          platform,
          platform_conversation_id: conversationId
        })
        
        // conversations 테이블 구독 (messaging_window_expires_at 업데이트 감지)
        conversationsChannel = supabase
          .channel(`conversation-${conversationData.id}`)
          .on(
            'postgres_changes',
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'conversations',
              filter: `id=eq.${conversationData.id}`
            },
            (payload: any) => {
              console.log('📊 Conversation updated:', payload)
              if (payload.new?.messaging_window_expires_at !== undefined) {
                console.log('⏰ Messaging window updated:', payload.new.messaging_window_expires_at)
                setCurrentMessagingWindowExpiresAt(payload.new.messaging_window_expires_at)
              }
            }
          )
          .subscribe()
        
        // 통합 messages 테이블 구독 (INSERT와 UPDATE 모두)
        channel = supabase
          .channel(`messages-${conversationData.id}`)
          .on(
            'postgres_changes',
            { 
              event: '*',  // INSERT와 UPDATE 모두 구독
              schema: 'public', 
              table: 'messages',
              filter: `conversation_id=eq.${conversationData.id}`
            },
            (payload) => {
              console.log(`🔔 Message event (${payload.eventType}):`, payload)
              const newMessage = payload.new as any
              
              // messages 테이블 형식을 프론트엔드 형식으로 변환
              const convertedMessage: OptimisticMessage = {
                id: newMessage.id,
                webhook_type: 'message',
                message_id: newMessage.original_message_id,
                message_text: newMessage.message_text,
                message_timestamp: new Date(newMessage.message_timestamp).getTime(),
                sender_id: newMessage.sender_id,
                recipient_id: newMessage.recipient_id,
                is_echo: newMessage.sender_type === 'business',
                attachments: newMessage.attachments,
                created_at: newMessage.created_at,
                raw_data: {
                  platform: newMessage.platform,
                  sender_type: newMessage.sender_type,
                  message_type: newMessage.message_type
                }
              }
              
              // UPDATE 이벤트 처리 (예: LINE 이미지 URL 추가)
              if (payload.eventType === 'UPDATE') {
                console.log('📝 Updating existing message:', newMessage.id)
                setMessages(prev => prev.map(msg => 
                  msg.id === newMessage.id ? convertedMessage : msg
                ))
              }
              // INSERT 이벤트 처리 (새 메시지)
              else if (payload.eventType === 'INSERT') {
                // echo 메시지인 경우 낙관적 메시지를 대체
                if (newMessage.sender_type === 'business') {
                  setMessages(prev => {
                    const optimisticIndex = prev.findIndex(msg => 
                      msg.optimisticId &&
                      (msg.status === 'pending' || msg.status === 'sent') &&
                      msg.message_text === newMessage.message_text
                    )
                    
                    if (optimisticIndex !== -1) {
                      const newMessages = [...prev]
                      newMessages[optimisticIndex] = convertedMessage
                      return newMessages
                    }
                    // Optimistic 메시지를 찾지 못한 경우 그냥 추가
                    return [...prev, convertedMessage]
                  })
                } else {
                  // 고객 메시지는 그냥 추가
                  setMessages(prev => [...prev, convertedMessage])
                }
                
                setTimeout(() => {
                  scrollToBottom()
                }, 50)
              }
            }
          )
          
          // 구독 시작
          channel.subscribe((status: any) => {
            console.log('Realtime subscription status:', status)
          })
        } else {
          console.warn('Could not find conversation ID for realtime subscription')
        }
        
        return { messagesChannel: channel, conversationsChannel }
      }
      
      // 비동기 함수 실행 및 cleanup
      let cleanupChannels: any
      setupRealtimeSubscription().then(channels => {
        cleanupChannels = channels
      })

      return () => {
        // cleanup에서 캐시 저장 제거 (stale closure 문제 방지)
        // 캐시는 별도의 useEffect에서 실시간으로 업데이트됨
        
        // fetch 요청 취소
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        
        console.log('Removing realtime channels')
        if (cleanupChannels) {
          if (cleanupChannels.messagesChannel) {
            supabase.removeChannel(cleanupChannels.messagesChannel)
          }
          if (cleanupChannels.conversationsChannel) {
            supabase.removeChannel(cleanupChannels.conversationsChannel)
          }
        }
      }
    }
  }, [conversationId, status, platform])


  // \uc0c1\ub2e8 \uc2a4\ud06c\ub864 \uac10\uc9c0\ub97c \uc704\ud55c useEffect
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      // \uc0c1\ub2e8\uc5d0 \ub3c4\ub2ec\ud588\uc744 \ub54c (\uc2a4\ud06c\ub864 \uc704\uce58\uac00 300px \ubbf8\ub9cc\uc77c \ub54c)
      if (container.scrollTop < 300 && hasMore && !loadingMore && messages.length > 0) {
        fetchMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadingMore, messages.length, offset])

  // 초기 메시지 로드 시 스크롤을 맨 아래로
  useLayoutEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current && isFirstLoad) {
      // 바로 스크롤 (모든 미디어가 고정 높이로 레이아웃 shift 없음)
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      setIsFirstLoad(false)
    }
  }, [messages, isFirstLoad])
  
  const fetchMessages = async (customOffset?: number, isInitial: boolean = false) => {
    if (!conversationId || (loadingMore && !isInitial)) return
    
    const currentOffset = customOffset !== undefined ? customOffset : offset
    
    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController()
    
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?offset=${currentOffset}&limit=50`,
        { signal: abortControllerRef.current.signal }
      )
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
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to fetch messages:', error)
      }
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
      
      // Reset textarea height and focus
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.focus()
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
        sender_id: platform === 'line' ? 'line_business_account' : businessAccountId,
        recipient_id: platform === 'line' ? conversationId : customerId,
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
      const response = await fetch('/api/messages/unified/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform,  // 플랫폼 정보 추가
          conversationId: conversationId,
          recipientId: customerId,
          messageText: messageContent,
          messageType: 'text'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // 메시징 윈도우 만료 에러 처리
        if (errorData.error_code === 'MESSAGING_WINDOW_EXPIRED') {
          // 메시지 상태를 실패로 변경하고 만료 이유 저장
          setMessages(prev => prev.map(msg => 
            msg.optimisticId === optimisticId 
              ? { ...msg, status: 'failed', failureReason: 'MESSAGING_WINDOW_EXPIRED' }
              : msg
          ))
          return
        }
        
        throw new Error(`전송 실패: ${errorData.error || 'Unknown error'}`)
      }
      
      // 성공 시 상태 업데이트 (나중에 echo 웹훅으로 대체됨)
      setMessages(prev => prev.map(msg => 
        msg.optimisticId === optimisticId 
          ? { ...msg, status: 'sent' }
          : msg
      ))
      
      // 답장 시 unread_count를 0으로 리셋
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('platform_conversation_id', conversationId)
    } catch (error) {
      console.error('Send error:', error)
      // 실패 시 상태 업데이트
      setMessages(prev => prev.map(msg => 
        msg.optimisticId === optimisticId 
          ? { ...msg, status: 'failed', failureReason: 'GENERAL_ERROR' }
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
    // LINE 스티커 메시지 체크 (message_type이 'sticker'인 경우)
    if (message.raw_data?.message_type === 'sticker' || 
        (message.raw_data?.platform === 'line' && message.attachments?.[0]?.type === 'sticker')) {
      return (
        <p className="text-xs italic text-gray-500">
          스티커를 보냈습니다.
        </p>
      )
    }
    
    // 텍스트 메시지
    if (message.message_text) {
      return (
        <p className="text-xs whitespace-pre-wrap break-words">
          {message.message_text}
        </p>
      )
    }

    // 첨부파일
    if (message.attachments) {
      // attachments가 배열이 아닐 수도 있으므로 배열로 변환
      const attachmentsArray = Array.isArray(message.attachments) 
        ? message.attachments 
        : [message.attachments];
      
      return (
        <div className="space-y-2">
          {attachmentsArray.map((attachment: any, idx: number) => {
            if (attachment.type === 'image') {
              // LINE 이미지 처리
              if (attachment.contentProvider?.type === 'line') {
                // 다운로드 완료되어 URL이 있는 경우
                if (attachment.originalUrl) {
                  return (
                    <img
                      key={idx}
                      src={attachment.originalUrl}
                      alt="이미지"
                      className="max-w-full rounded-lg bg-gray-100"
                      style={{ height: '300px', objectFit: 'contain' }}
                    />
                  )
                }
                
                // 다운로드 중이거나 대기 중인 경우
                return (
                  <div key={idx} className="relative w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">
                        {attachment.downloaded === false ? '다운로드 중...' : '이미지'}
                        {attachment.imageSet ? ` (${attachment.imageSet.index}/${attachment.imageSet.total})` : ''}
                      </p>
                      {attachment.error && (
                        <p className="text-xs text-red-500 mt-1">로드 실패</p>
                      )}
                    </div>
                  </div>
                )
              }
              // External 이미지 또는 Instagram 이미지 (URL 있음)
              else if (attachment.originalContentUrl || attachment.payload?.url) {
                return (
                  <img
                    key={idx}
                    src={attachment.originalContentUrl || attachment.payload?.url}
                    alt="Image attachment"
                    className="max-w-full rounded-lg bg-gray-100"
                    style={{ height: '300px', objectFit: 'contain' }}
                  />
                )
              }
              // 기본 이미지 플레이스홀더
              else {
                return (
                  <div key={idx} className="relative w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">이미지</p>
                    </div>
                  </div>
                )
              }
            } else if (attachment.type === 'video') {
              // External 비디오 또는 Instagram 비디오 (URL 있음)
              if (attachment.originalContentUrl || attachment.payload?.url) {
                return (
                  <video
                    key={idx}
                    src={attachment.originalContentUrl || attachment.payload?.url}
                    controls
                    className="max-w-full rounded-lg bg-gray-100"
                    style={{ height: '300px', objectFit: 'contain' }}
                    poster={attachment.previewImageUrl}
                  >
                    브라우저가 비디오를 지원하지 않습니다.
                  </video>
                )
              }
              // LINE 비디오 처리
              else {
                const duration = attachment.duration ? `${Math.floor(attachment.duration / 1000)}초` : ''
                
                // 다운로드 완료되어 URL이 있는 경우
                if (attachment.originalUrl) {
                  return (
                    <video
                      key={idx}
                      src={attachment.originalUrl}
                      controls
                      className="max-w-full rounded-lg bg-gray-100"
                      style={{ height: '300px', objectFit: 'contain' }}
                    >
                      브라우저가 비디오를 지원하지 않습니다.
                    </video>
                  )
                }
                
                // 다운로드 중이거나 대기 중인 경우
                return (
                  <div key={idx} className="relative w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-gray-500">
                        {attachment.downloaded === false ? '다운로드 중...' : `동영상 ${duration}`}
                      </p>
                      {attachment.error && (
                        <p className="text-xs text-red-500 mt-1">로드 실패</p>
                      )}
                    </div>
                  </div>
                )
              }
            } else if (attachment.type === 'audio') {
              // URL이 있는 경우 (Instagram 등)
              if (attachment.payload?.url) {
                return (
                  <audio
                    key={idx}
                    src={attachment.payload?.url}
                    controls
                    className="max-w-xs"
                    style={{ height: '54px' }}
                  />
                )
              }
              // LINE 오디오 처리
              else {
                const duration = attachment.duration ? `${Math.floor(attachment.duration / 1000)}초` : ''
                
                // 다운로드 완료되어 URL이 있는 경우
                if (attachment.originalUrl) {
                  return (
                    <audio
                      key={idx}
                      src={attachment.originalUrl}
                      controls
                      className="max-w-xs"
                      style={{ height: '54px' }}
                    />
                  )
                }
                
                // 다운로드 중이거나 대기 중인 경우
                return (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {attachment.downloaded === false ? '다운로드 중...' : '오디오'}
                      </p>
                      <p className="text-xs text-gray-500">{duration}</p>
                      {attachment.error && (
                        <p className="text-xs text-red-500">로드 실패</p>
                      )}
                    </div>
                  </div>
                )
              }
            } else if (attachment.type === 'file') {
              // 다운로드 완료되어 URL이 있는 경우
              if (attachment.originalUrl) {
                return (
                  <a
                    key={idx}
                    href={attachment.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-700">{attachment.fileName || '파일'}</p>
                      {attachment.fileSize && (
                        <p className="text-xs text-gray-500">
                          {(attachment.fileSize / 1024).toFixed(1)} KB
                        </p>
                      )}
                      <p className="text-xs text-blue-500">클릭하여 다운로드</p>
                    </div>
                  </a>
                )
              }
              
              // 다운로드 중이거나 대기 중인 경우
              return (
                <div key={idx} className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      {attachment.downloaded === false ? '다운로드 중...' : (attachment.fileName || '파일')}
                    </p>
                    {attachment.fileSize && (
                      <p className="text-xs text-gray-500">
                        {(attachment.fileSize / 1024).toFixed(1)} KB
                      </p>
                    )}
                    {attachment.error && (
                      <p className="text-xs text-red-500">로드 실패</p>
                    )}
                  </div>
                </div>
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
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            {customerName || customerId || 'Unknown User'}
          </h3>
          {/* Platform Icon */}
          <img 
            src={platform === 'line' ? '/line-logo.svg' : '/instagram-logo.png'} 
            alt={platform} 
            className="w-4 h-4 object-contain"
          />
        </div>
        <button
          onClick={async () => {
            if (!conversationId || isCompleting) return
            
            const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed'
            
            setIsCompleting(true)
            try {
              const response = await fetch(`/api/conversations/${conversationId}/status`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
              })
              
              if (response.ok) {
                setCurrentStatus(newStatus)
                console.log(`상태가 ${newStatus}로 변경됨`)
                // 부모 컴포넌트에 상태 변경 알림
                if (onStatusChange) {
                  onStatusChange(newStatus)
                }
              } else {
                console.error('상태 업데이트 실패')
                alert('상태 업데이트에 실패했습니다.')
              }
            } catch (error) {
              console.error('Error updating status:', error)
              alert('상태 업데이트 중 오류가 발생했습니다.')
            } finally {
              setIsCompleting(false)
            }
          }}
          disabled={isCompleting}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            isCompleting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : currentStatus === 'completed'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {
            isCompleting 
              ? '처리 중...' 
              : currentStatus === 'completed' 
                ? '상담 재시작'
                : '상담 완료'
          }
        </button>
      </div>

      {/* Messaging Window Warning Banner - Instagram only */}
      {platform === 'instagram' && currentMessagingWindowExpiresAt && (() => {
        const expiresAt = new Date(currentMessagingWindowExpiresAt)
        const now = new Date()
        const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
        const isExpired = hoursRemaining <= 0
        const showWarning = hoursRemaining <= 6 // Show warning when 6 hours or less remaining
        
        if (!showWarning && !isExpired) return null
        
        const hours = Math.floor(Math.abs(hoursRemaining))
        const minutes = Math.floor((Math.abs(hoursRemaining) * 60) % 60)
        
        return (
          <div className={`px-6 py-3 border-b ${
            isExpired 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <svg className={`w-5 h-5 ${
                isExpired ? 'text-red-600' : 'text-yellow-600'
              }`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  isExpired ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {isExpired ? '메시징 윈도우 만료됨' : '메시징 윈도우 곧 만료'}
                </p>
                <p className={`text-xs mt-1 ${
                  isExpired ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {isExpired 
                    ? '고객이 새 메시지를 보내야 대화를 계속할 수 있습니다.'
                    : `${hours}시간 ${minutes}분 후 만료됩니다.`
                  }
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
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
                    <Fragment key={msg.optimisticId || msg.id}>
                    <div
                      className={`flex ${isBusinessMessage ? 'justify-end' : 'justify-start'} ${isSameMinuteAsNext ? 'mb-1' : 'mb-3'} group`}
                    >
                      <div className={`flex ${isBusinessMessage ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 max-w-xs lg:max-w-md`}>
                        {/* 말풍선 */}
                        <div
                          className={`px-4 py-2 rounded-2xl relative ${
                            isBusinessMessage
                              ? msg.status === 'failed'
                                ? 'bg-red-500 text-white'
                                : 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          } ${msg.status === 'pending' ? 'opacity-70' : ''}`}
                        >
                          {renderMessageContent(msg)}
                        </div>
                        
                        {/* 실패 상태 표시 */}
                        {msg.status === 'failed' && (
                          <>
                            <span className="inline-flex items-center gap-1 bg-white rounded-full px-2 py-0.5 self-end shadow-sm">
                              {msg.failureReason !== 'MESSAGING_WINDOW_EXPIRED' && (
                                <button
                                  onClick={() => retryMessage(msg)}
                                  className="text-gray-500 hover:text-gray-700 transition-colors"
                                  title="재전송"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => deleteFailedMessage(msg.optimisticId!)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                title="삭제"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                            <span className="text-[10px] text-red-500 whitespace-nowrap self-end">
                              {msg.failureReason === 'MESSAGING_WINDOW_EXPIRED' 
                                ? '24시간 만료' 
                                : '실패'
                              }
                            </span>
                          </>
                        )}
                        
                        {/* 시간 표시 - 실패한 메시지는 시간 표시 안함 */}
                        {!isSameMinuteAsNext && msg.status !== 'failed' && (
                          <div className="text-[10px] text-gray-500 whitespace-nowrap self-end">
                            {formatTime(msg.message_timestamp || msg.created_at)}
                            {msg.status === 'pending' && ' • 전송 중...'}
                          </div>
                        )}
                      </div>
                    </div>
                    </Fragment>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {/* File Attachment Button */}
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
            placeholder={
              !customerId ? "대화를 선택하세요" :
              !messagingWindowStatus.canSend ? "메시징 시간이 만료되었습니다" :
              "메시지 입력..."
            }
            disabled={!customerId || !messagingWindowStatus.canSend}
            rows={1}
            className={`flex-1 px-4 py-2 text-xs border border-gray-300 rounded-2xl resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !customerId || !messagingWindowStatus.canSend ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
            style={{
              minHeight: '36px',
              maxHeight: '60px', // Approximately 3 lines
            }}
          />
          
          {/* Send Button */}
          <button
            onClick={() => {
              sendMessage()
              // Reset textarea height and focus after sending
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.focus()
              }
            }}
            disabled={!customerId || !messageText.trim() || !messagingWindowStatus.canSend}
            className={`p-2 rounded-full transition-colors ${
              !customerId || !messageText.trim() || !messagingWindowStatus.canSend
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={!messagingWindowStatus.canSend ? "메시징 시간 만료" : "전송"}
          >
            <svg className="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}