'use client'

import { useState } from 'react'
import WebhookDashboard from '@/components/WebhookDashboard'
import MessageSender from '@/components/MessageSender'
import ProfileManager from '@/components/ProfileManager'
import ConversationsPage from '@/components/ConversationsPage'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'dashboard' | 'send' | 'profiles'>('conversations')

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'conversations'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Conversations
          </button>
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
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'profiles'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            User Profiles
          </button>
        </div>

        {activeTab === 'conversations' ? (
          <ConversationsPage />
        ) : activeTab === 'dashboard' ? (
          <WebhookDashboard />
        ) : activeTab === 'send' ? (
          <MessageSender />
        ) : (
          <ProfileManager />
        )}
      </div>
    </main>
  )
}
