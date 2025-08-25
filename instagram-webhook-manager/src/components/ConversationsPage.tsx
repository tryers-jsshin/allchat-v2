'use client'

import { useState } from 'react'
import ConversationsList from './ConversationsList'
import ConversationView from './ConversationView'

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
    <div className="h-[calc(100vh-8rem)] flex bg-gray-50">
      {/* Conversations List - Left Panel */}
      <div className="w-full md:w-1/3 lg:w-1/4 min-w-[300px] max-w-[400px]">
        <ConversationsList
          onSelectConversation={setSelectedConversation}
          selectedConversationId={selectedConversation?.conversation_id}
        />
      </div>

      {/* Conversation View - Right Panel */}
      <div className="flex-1">
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
    </div>
  )
}