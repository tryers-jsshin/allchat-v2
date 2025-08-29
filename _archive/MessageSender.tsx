'use client'

import { useState } from 'react'

interface MessageSenderProps {
  recipientId?: string
  onMessageSent?: (data: any) => void
}

export default function MessageSender({ recipientId: defaultRecipientId, onMessageSent }: MessageSenderProps) {
  const [recipientId, setRecipientId] = useState(defaultRecipientId || '')
  const [messageType, setMessageType] = useState('text')
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [postId, setPostId] = useState('')
  const [messageId, setMessageId] = useState('')
  const [reaction, setReaction] = useState('love')
  const [accessToken, setAccessToken] = useState('')
  const [igBusinessId, setIgBusinessId] = useState('')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async () => {
    setSending(true)
    setError(null)
    setResponse(null)

    try {
      const payload: any = {
        recipientId,
        messageType,
        accessToken: accessToken || undefined,
        igBusinessId: igBusinessId || undefined
      }

      // Add type-specific fields
      switch (messageType) {
        case 'text':
          payload.content = content
          break
        case 'image':
        case 'gif':
        case 'video':
        case 'audio':
          payload.mediaUrl = mediaUrl
          break
        case 'reaction':
          payload.messageId = messageId
          payload.reaction = reaction
          break
        case 'media_share':
          payload.postId = postId
          break
      }

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setResponse(data)
      onMessageSent?.(data)
      
      // Clear form on success
      if (messageType === 'text') setContent('')
      if (['image', 'gif', 'video', 'audio'].includes(messageType)) setMediaUrl('')
      if (messageType === 'media_share') setPostId('')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Send Instagram Message</h2>
      
      <div className="space-y-4">
        {/* Recipient ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient ID (IGSID) *
          </label>
          <input
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md"
            placeholder="Instagram Scoped ID"
            required
          />
        </div>

        {/* Message Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Type
          </label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md"
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="gif">GIF</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="sticker">Like Heart Sticker</option>
            <option value="reaction">Reaction</option>
            <option value="media_share">Share Post</option>
          </select>
        </div>

        {/* Type-specific fields */}
        {messageType === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Text *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md"
              rows={3}
              placeholder="Enter your message..."
              required
            />
          </div>
        )}

        {['image', 'gif', 'video', 'audio'].includes(messageType) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media URL *
            </label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md"
              placeholder="https://example.com/media.jpg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {messageType === 'image' && 'PNG, JPEG, or GIF (max 8MB)'}
              {messageType === 'video' && 'MP4, OGG, AVI, MOV, or WEBM (max 25MB)'}
              {messageType === 'audio' && 'AAC, M4A, WAV, or MP4 (max 25MB)'}
            </p>
          </div>
        )}

        {messageType === 'reaction' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message ID to React To *
              </label>
              <input
                type="text"
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
                placeholder="Message ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reaction Type
              </label>
              <select
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
              >
                <option value="love">❤️ Love</option>
                <option value="wow">😮 Wow</option>
                <option value="sad">😢 Sad</option>
                <option value="angry">😠 Angry</option>
                <option value="like">👍 Like</option>
                <option value="haha">😂 Haha</option>
              </select>
            </div>
          </>
        )}

        {messageType === 'media_share' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Post ID *
            </label>
            <input
              type="text"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md"
              placeholder="Instagram Post ID"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              You must own this post to share it
            </p>
          </div>
        )}

        {/* Advanced Settings */}
        <details className="border border-gray-200 rounded-md p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Advanced Settings (Optional)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Leave empty to use environment variable"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram Business ID
              </label>
              <input
                type="text"
                value={igBusinessId}
                onChange={(e) => setIgBusinessId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Leave empty to use 'me' or environment variable"
              />
            </div>
          </div>
        </details>

        {/* Send Button */}
        <button
          onClick={sendMessage}
          disabled={sending || !recipientId}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send Message'}
        </button>

        {/* Response/Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {response && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <p className="font-semibold">Success!</p>
            <pre className="text-xs mt-2 overflow-x-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}