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
  customer_profile?: {
    name?: string
    username?: string
  }
}

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  return (
    <div className="h-screen flex bg-gray-50">
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
          customerName={
            selectedConversation?.customer_profile?.name || 
            selectedConversation?.customer_profile?.username
          }
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
  )
}