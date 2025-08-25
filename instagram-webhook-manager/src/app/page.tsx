'use client'

import { useState } from 'react'
import WebhookDashboard from '@/components/WebhookDashboard'
import MessageSender from '@/components/MessageSender'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'send'>('dashboard')

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Webhook Dashboard
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'send'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Send Message
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <WebhookDashboard />
        ) : (
          <MessageSender />
        )}
      </div>
    </main>
  )
}
