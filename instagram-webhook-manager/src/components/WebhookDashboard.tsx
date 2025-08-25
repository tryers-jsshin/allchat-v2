'use client'

import { useEffect, useState } from 'react'
import { WebhookRecord, supabase } from '@/lib/supabase'

export default function WebhookDashboard() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRecord | null>(null)

  useEffect(() => {
    // Initial fetch
    fetchWebhooks()
    
    // Set up realtime subscription
    const channel = supabase
      .channel('webhooks-channel')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'instagram_webhooks' 
        },
        (payload) => {
          console.log('🔔 New webhook received:', payload)
          // Add new webhook to the beginning of the list
          setWebhooks(prev => [payload.new as WebhookRecord, ...prev])
          
          // Optional: Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const webhook = payload.new as WebhookRecord
            const message = webhook.message_text || 'New webhook received'
            new Notification('Instagram Webhook', {
              body: message,
              icon: '/icon.png'
            })
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks')
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getMessagePreview = (webhook: WebhookRecord) => {
    // Direct message text
    if (webhook.message_text) {
      return webhook.message_text
    }
    
    // Fallback to raw data parsing
    if (webhook.raw_data?.entry?.[0]?.messaging?.[0]?.message?.text) {
      return webhook.raw_data.entry[0].messaging[0].message.text
    }
    
    // Special cases based on webhook type
    switch (webhook.webhook_type) {
      case 'reaction':
        return `${webhook.reaction_action === 'react' ? '👍' : '👎'} ${webhook.reaction_type || 'Reaction'}`
      case 'postback':
        return `Button: ${webhook.postback_title || 'Postback'}`
      case 'read':
        return '✓✓ Message read'
      case 'referral':
        return `Referral from ${webhook.referral_source || 'unknown'}`
      case 'ephemeral':
        return '🕐 Ephemeral media'
      default:
        return 'No text content'
    }
  }
  
  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-800'
      case 'reaction':
        return 'bg-purple-100 text-purple-800'
      case 'postback':
        return 'bg-green-100 text-green-800'
      case 'read':
        return 'bg-gray-100 text-gray-800'
      case 'referral':
        return 'bg-yellow-100 text-yellow-800'
      case 'ephemeral':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      case 'file':
        return '📎'
      case 'story_mention':
        return '📸'
      case 'ig_reel':
      case 'reel':
        return '🎬'
      default:
        return '📁'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Instagram Webhook Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time webhook monitoring via Supabase</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Webhooks</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {webhooks.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No webhooks received yet
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedWebhook(webhook)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWebhookTypeColor(webhook.webhook_type)}`}>
                            {webhook.webhook_type}
                          </span>
                          {webhook.attachment_types && webhook.attachment_types.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              {webhook.attachment_types.map((type: string, idx: number) => (
                                <span key={idx} title={type}>
                                  {getAttachmentIcon(type)}
                                </span>
                              ))}
                            </span>
                          )}
                          {webhook.processed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Processed
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-900 truncate">
                          {getMessagePreview(webhook)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>From: {webhook.sender_id || 'Unknown'}</span>
                          {webhook.reply_to_message_id && <span className="text-blue-600">↩️ Reply</span>}
                          {webhook.is_echo && <span className="text-green-600">📤 Sent</span>}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-xs text-gray-500">
                          {formatDate(webhook.created_at!)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Webhook Details</h2>
            </div>
            <div className="p-4">
              {selectedWebhook ? (
                <div>
                  <div className="mb-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Type:</span>
                        <p className="text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getWebhookTypeColor(selectedWebhook.webhook_type)}`}>
                            {selectedWebhook.webhook_type}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Created:</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedWebhook.created_at!)}</p>
                      </div>
                    </div>
                    
                    {selectedWebhook.message_text && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Message:</span>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{selectedWebhook.message_text}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Sender:</span>
                        <p className="text-sm text-gray-900">{selectedWebhook.sender_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Recipient:</span>
                        <p className="text-sm text-gray-900">{selectedWebhook.recipient_id || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {selectedWebhook.message_id && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Message ID:</span>
                        <p className="text-xs text-gray-900 font-mono break-all">{selectedWebhook.message_id}</p>
                      </div>
                    )}
                    
                    {selectedWebhook.attachments && selectedWebhook.attachments.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Attachments:</span>
                        <div className="mt-1 space-y-1">
                          {selectedWebhook.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-900 flex items-center gap-2">
                              <span>{getAttachmentIcon(att.type)}</span>
                              <span>{att.type}</span>
                              {att.payload?.url && (
                                <a href={att.payload.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Reaction specific fields */}
                    {selectedWebhook.webhook_type === 'reaction' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Action:</span>
                          <p className="text-sm text-gray-900">{selectedWebhook.reaction_action}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Reaction:</span>
                          <p className="text-sm text-gray-900">{selectedWebhook.reaction_emoji || selectedWebhook.reaction_type}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Postback specific fields */}
                    {selectedWebhook.webhook_type === 'postback' && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Button:</span>
                        <p className="text-sm text-gray-900">{selectedWebhook.postback_title}</p>
                        {selectedWebhook.postback_payload && (
                          <p className="text-xs text-gray-600 mt-1">Payload: {selectedWebhook.postback_payload}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Reply information */}
                    {(selectedWebhook.reply_to_message_id || selectedWebhook.reply_to_story_id) && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">Reply to:</span>
                        {selectedWebhook.reply_to_message_id && (
                          <p className="text-xs text-gray-900">Message: {selectedWebhook.reply_to_message_id}</p>
                        )}
                        {selectedWebhook.reply_to_story_id && (
                          <p className="text-xs text-gray-900">Story: {selectedWebhook.reply_to_story_id}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Status flags */}
                    <div className="flex gap-2 flex-wrap">
                      {selectedWebhook.is_echo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Echo
                        </span>
                      )}
                      {selectedWebhook.is_deleted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Deleted
                        </span>
                      )}
                      {selectedWebhook.is_unsupported && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Unsupported
                        </span>
                      )}
                      {selectedWebhook.processed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Processed
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Raw Data:</span>
                    <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedWebhook.raw_data, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Select a webhook to view details
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}