'use client';

import { useState, useEffect } from 'react';
import { Send, Webhook, User, MessageCircle, AlertCircle } from 'lucide-react';

interface WebhookEvent {
  id: string;
  timestamp: string;
  type: string;
  source: any;
  message?: any;
  replyToken?: string;
  raw: any;
}

interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export default function LineDemoPage() {
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [messageText, setMessageText] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [sendMode, setSendMode] = useState<'reply' | 'push'>('push');
  const [replyToken, setReplyToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Connect to SSE stream for real-time webhook events
  useEffect(() => {
    // Fetch initial events
    const fetchInitialEvents = async () => {
      try {
        const response = await fetch('/api/webhooks/line/events');
        if (response.ok) {
          const data = await response.json();
          setWebhookEvents(data.events || []);
        }
      } catch (err) {
        console.error('Failed to fetch initial events:', err);
      }
    };

    fetchInitialEvents();

    // Set up SSE connection
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/webhooks/line/stream');
        
        eventSource.onopen = () => {
          console.log('SSE connection established');
          reconnectAttempts = 0;
          setError(null);
          setConnectionStatus('connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'webhook') {
              // Add new webhook event to the list
              setWebhookEvents(prev => {
                const newEvents = [data.event, ...prev];
                // Keep only the latest 100 events
                return newEvents.slice(0, 100);
              });
              
              // Show notification for new event
              setSuccess(`New ${data.event.type} event received!`);
              setTimeout(() => setSuccess(null), 3000);
            } else if (data.type === 'connected') {
              console.log('Connected to LINE webhook stream');
            } else if (data.type === 'heartbeat') {
              // Heartbeat received, connection is alive
              console.log('Heartbeat received');
            }
          } catch (err) {
            console.error('Error parsing SSE data:', err);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          eventSource?.close();
          setConnectionStatus('disconnected');
          
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1);
            console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            setConnectionStatus('connecting');
            
            reconnectTimeout = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setError('Lost connection to webhook stream. Please refresh the page.');
            setConnectionStatus('disconnected');
          }
        };
      } catch (err) {
        console.error('Failed to create SSE connection:', err);
        setError('Failed to connect to webhook stream');
      }
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      eventSource?.close();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/profiles/line/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }
      const data = await response.json();
      setUserProfile(data);
      setSuccess('Profile fetched successfully!');
    } catch (err: any) {
      setError(err.message);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim()) {
      setError('Please enter a message');
      return;
    }

    if (sendMode === 'push' && !recipientId) {
      setError('Please enter a recipient ID');
      return;
    }

    if (sendMode === 'reply' && !replyToken) {
      setError('Please select a webhook event with a reply token');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/messages/line/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: sendMode,
          to: sendMode === 'push' ? recipientId : undefined,
          replyToken: sendMode === 'reply' ? replyToken : undefined,
          messages: [
            {
              type: 'text',
              text: messageText
            }
          ]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSuccess('Message sent successfully!');
      setMessageText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle event selection
  const handleEventClick = (event: WebhookEvent) => {
    setSelectedEvent(event);
    if (event.replyToken) {
      setReplyToken(event.replyToken);
      setSendMode('reply');
    }
    if (event.source?.userId) {
      setRecipientId(event.source.userId);
      fetchUserProfile(event.source.userId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">LINE API Demo</h1>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webhook Events */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Webhook className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Webhook Events</h2>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-500">
                    {connectionStatus === 'connected' ? 'Live' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     'Disconnected'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {webhookEvents.length} events
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {webhookEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No webhook events received yet. Send a message to your LINE bot to see events here.
                </p>
              ) : (
                webhookEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{event.type}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.message && (
                      <p className="text-sm text-gray-600 truncate">
                        {event.message.type}: {event.message.text || '(media)'}
                      </p>
                    )}
                    {event.source && (
                      <p className="text-xs text-gray-500 mt-1">
                        Source: {event.source.type} - {event.source.userId?.substring(0, 10)}...
                      </p>
                    )}
                    {event.replyToken && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        Has Reply Token
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Selected Event Details */}
            {selectedEvent && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Event Details</h3>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(selectedEvent.raw, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* User Profile */}
            {userProfile && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold">User Profile</h2>
                </div>
                <div className="flex items-center gap-4">
                  {userProfile.pictureUrl && (
                    <img
                      src={userProfile.pictureUrl}
                      alt={userProfile.displayName}
                      className="w-16 h-16 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{userProfile.displayName}</p>
                    <p className="text-xs text-gray-500">{userProfile.userId}</p>
                    {userProfile.statusMessage && (
                      <p className="text-sm text-gray-600 mt-1">{userProfile.statusMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Send Message */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">Send Message</h2>
              </div>

              <div className="space-y-4">
                {/* Send Mode */}
                <div>
                  <label className="block text-sm font-medium mb-2">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSendMode('push')}
                      className={`px-3 py-1 rounded ${
                        sendMode === 'push'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Push
                    </button>
                    <button
                      onClick={() => setSendMode('reply')}
                      className={`px-3 py-1 rounded ${
                        sendMode === 'reply'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Reply
                    </button>
                  </div>
                </div>

                {/* Recipient ID (for push) */}
                {sendMode === 'push' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Recipient ID
                    </label>
                    <input
                      type="text"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="User ID"
                    />
                  </div>
                )}

                {/* Reply Token (for reply) */}
                {sendMode === 'reply' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Reply Token
                    </label>
                    <input
                      type="text"
                      value={replyToken}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Select an event with reply token"
                    />
                  </div>
                )}

                {/* Message Text */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Message
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter your message..."
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-medium mb-2">Instructions</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Send a message to your LINE bot</li>
                <li>Watch for webhook events to appear</li>
                <li>Click an event to see details and user profile</li>
                <li>Use Reply mode to respond quickly</li>
                <li>Use Push mode to send messages anytime</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}