'use client'

import { Bot } from 'lucide-react'

interface ConsultationAssistantProps {
  conversationId?: string
  customerId?: string
  customerName?: string
}

export default function ConsultationAssistant({
  conversationId,
  customerId,
  customerName
}: ConsultationAssistantProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">상담 어시스턴트</h2>
        </div>
        {customerName && (
          <p className="text-sm text-gray-500 mt-1">
            {customerName}님과의 대화
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Empty content area */}
      </div>
    </div>
  )
}