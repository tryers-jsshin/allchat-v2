'use client'

import { useState } from 'react'
import ConversationsList from './ConversationsList'
import ConversationView from './ConversationView'
import ConsultationAssistant from './ConsultationAssistant'

interface Conversation {
  id: string
  conversation_id: string
  business_account_id: string
  customer_id: string
  unread_count: number
  status?: string
  platform?: string  // 플랫폼 추가
  messaging_window_expires_at?: string  // 메시징 윈도우 만료 시간
  customer_profile?: {
    name?: string
    username?: string
  }
}

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  const handleStatusChange = (newStatus: string) => {
    // 상담 완료 시 채팅창 닫기
    if (newStatus === 'completed') {
      setSelectedConversation(null)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">AllChat</h1>
          <span className="text-sm text-gray-600">통합 메신저 상담 관리 시스템</span>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Customer Messages - Left Panel */}
        <div className="w-1/4 min-w-[280px] max-w-[350px] border-r border-gray-200">
        <ConversationsList
          onSelectConversation={setSelectedConversation}
          selectedConversationId={selectedConversation?.conversation_id}
        />
      </div>

        {/* Chat View - Center Panel */}
        <div className="flex-1 min-w-[400px]">
          <ConversationView
          conversationId={selectedConversation?.conversation_id}
          businessAccountId={selectedConversation?.business_account_id}
          customerId={selectedConversation?.customer_id}
          status={selectedConversation?.status}
          platform={selectedConversation?.platform}
          messagingWindowExpiresAt={selectedConversation?.messaging_window_expires_at}
          customerName={
            selectedConversation?.customer_profile?.name || 
            selectedConversation?.customer_profile?.username
          }
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Consultation Assistant - Right Panel */}
        <div className="w-1/4 min-w-[280px] max-w-[350px] border-l border-gray-200">
          <ConsultationAssistant
            conversationId={selectedConversation?.conversation_id}
            customerId={selectedConversation?.customer_id}
            customerName={
              selectedConversation?.customer_profile?.name || 
              selectedConversation?.customer_profile?.username
            }
          />
        </div>
      </div>
    </div>
  )
}