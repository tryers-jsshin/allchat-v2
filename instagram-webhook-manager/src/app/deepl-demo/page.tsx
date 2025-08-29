'use client'

import { useState, useEffect } from 'react'

interface ApiStatus {
  success: boolean
  planType?: 'free' | 'pro'
  usage?: {
    character_count: number
    character_limit: number
  }
  error?: string
}

interface TranslationResult {
  text: string
  detected_source_language?: string
}

interface Language {
  language: string
  name: string
  supports_formality?: boolean
}

export default function DeepLDemoPage() {
  // API Status
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Single Translation
  const [sourceText, setSourceText] = useState('')
  const [targetLang, setTargetLang] = useState('KO')
  const [sourceLang, setSourceLang] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)

  // Batch Translation
  const [batchTexts, setBatchTexts] = useState(['', '', ''])
  const [batchResults, setBatchResults] = useState<TranslationResult[]>([])
  const [batchTranslating, setBatchTranslating] = useState(false)
  const [batchResponseTime, setBatchResponseTime] = useState<number | null>(null)

  // Language Detection
  const [detectText, setDetectText] = useState('')
  const [detectedLang, setDetectedLang] = useState('')
  const [detecting, setDetecting] = useState(false)

  // Languages
  const [sourceLanguages, setSourceLanguages] = useState<Language[]>([])
  const [targetLanguages, setTargetLanguages] = useState<Language[]>([])
  const [showLanguages, setShowLanguages] = useState(false)

  // Usage
  const [usage, setUsage] = useState<any>(null)

  // Test API connection on mount
  useEffect(() => {
    testConnection()
    fetchLanguages()
  }, [])

  const testConnection = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/translation/test')
      const data = await response.json()
      setApiStatus(data)
      if (data.usage) {
        setUsage(data.usage)
      }
    } catch (error) {
      setApiStatus({
        success: false,
        error: 'Failed to connect to API'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchLanguages = async () => {
    try {
      const response = await fetch('/api/translation/languages')
      const data = await response.json()
      if (data.success) {
        setSourceLanguages(data.sourceLanguages)
        setTargetLanguages(data.targetLanguages)
      }
    } catch (error) {
      console.error('Failed to fetch languages:', error)
    }
  }

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/translation/usage')
      const data = await response.json()
      if (data.success) {
        setUsage(data.usage)
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }

  const translateSingle = async () => {
    if (!sourceText.trim()) return

    setTranslating(true)
    setTranslatedText('')
    setResponseTime(null)

    try {
      const response = await fetch('/api/translation/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          targetLang,
          sourceLang: sourceLang || undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        setTranslatedText(data.result.text)
        setResponseTime(data.responseTime)
        if (data.result.detected_source_language && !sourceLang) {
          setSourceLang(data.result.detected_source_language)
        }
      } else {
        setTranslatedText(`Error: ${data.error}`)
      }
    } catch (error) {
      setTranslatedText('Translation failed')
    } finally {
      setTranslating(false)
      fetchUsage() // Update usage after translation
    }
  }

  const translateBatch = async () => {
    const validTexts = batchTexts.filter(t => t.trim())
    if (validTexts.length === 0) return

    setBatchTranslating(true)
    setBatchResults([])
    setBatchResponseTime(null)

    try {
      const response = await fetch('/api/translation/translate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: validTexts,
          targetLang
        })
      })

      const data = await response.json()
      if (data.success) {
        setBatchResults(data.results)
        setBatchResponseTime(data.responseTime)
      }
    } catch (error) {
      console.error('Batch translation failed:', error)
    } finally {
      setBatchTranslating(false)
      fetchUsage()
    }
  }

  const detectLanguage = async () => {
    if (!detectText.trim()) return

    setDetecting(true)
    setDetectedLang('')

    try {
      const response = await fetch('/api/translation/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: detectText })
      })

      const data = await response.json()
      if (data.success) {
        setDetectedLang(data.detectedLanguage)
      }
    } catch (error) {
      setDetectedLang('Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">DeepL API Test Dashboard</h1>

        {/* API Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Status</h2>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ) : apiStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${apiStatus.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">
                  {apiStatus.success ? 'Connected' : 'Disconnected'}
                </span>
                {apiStatus.planType && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {apiStatus.planType.toUpperCase()}
                  </span>
                )}
              </div>
              {apiStatus.usage && (
                <div className="text-sm text-gray-600">
                  Usage: {apiStatus.usage.character_count.toLocaleString()} / {apiStatus.usage.character_limit.toLocaleString()} characters
                </div>
              )}
              {apiStatus.error && (
                <div className="text-sm text-red-600">{apiStatus.error}</div>
              )}
              <button
                onClick={testConnection}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Reconnect
              </button>
            </div>
          ) : null}
        </div>

        {/* Single Translation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Single Translation Test</h2>
          
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Source Language</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto Detect</option>
                {sourceLanguages.map(lang => (
                  <option key={lang.language} value={lang.language}>
                    {lang.name} ({lang.language})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="KO">Korean (KO)</option>
                <option value="EN">English (EN)</option>
                <option value="JA">Japanese (JA)</option>
                <option value="ZH">Chinese (ZH)</option>
                {targetLanguages.map(lang => (
                  <option key={lang.language} value={lang.language}>
                    {lang.name} ({lang.language})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Original Text</label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full h-32 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Translation Result</label>
              <div className="w-full h-32 px-3 py-2 border rounded-lg bg-gray-50 overflow-auto">
                {translating ? (
                  <div className="animate-pulse">Translating...</div>
                ) : (
                  <div className="whitespace-pre-wrap">{translatedText}</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={translateSingle}
              disabled={!sourceText.trim() || translating}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {translating ? 'Translating...' : 'Translate'}
            </button>
            
            {responseTime !== null && (
              <span className="text-sm text-gray-600">
                Response time: {responseTime}ms
              </span>
            )}
          </div>
        </div>

        {/* Batch Translation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Batch Translation Test</h2>
          
          <div className="space-y-3 mb-4">
            {batchTexts.map((text, index) => (
              <div key={index} className="flex gap-4 items-center">
                <input
                  value={text}
                  onChange={(e) => {
                    const newTexts = [...batchTexts]
                    newTexts[index] = e.target.value
                    setBatchTexts(newTexts)
                  }}
                  placeholder={`Text ${index + 1}`}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1 px-3 py-2 border rounded-lg bg-gray-50">
                  {batchResults[index]?.text || ''}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={translateBatch}
                disabled={batchTranslating || batchTexts.every(t => !t.trim())}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {batchTranslating ? 'Translating...' : 'Batch Translate'}
              </button>
              
              <button
                onClick={() => {
                  setBatchTexts(prev => [...prev, ''])
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Add Field
              </button>
            </div>
            
            {batchResponseTime !== null && (
              <span className="text-sm text-gray-600">
                Response time: {batchResponseTime}ms
              </span>
            )}
          </div>
        </div>

        {/* Language Detection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Language Detection Test</h2>
          
          <div className="flex gap-4 mb-4">
            <input
              value={detectText}
              onChange={(e) => setDetectText(e.target.value)}
              placeholder="Enter text to detect language..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="px-4 py-2 border rounded-lg bg-gray-50 min-w-[150px]">
              {detecting ? (
                <span className="text-gray-500">Detecting...</span>
              ) : detectedLang ? (
                <span className="font-medium">{detectedLang}</span>
              ) : (
                <span className="text-gray-400">No result</span>
              )}
            </div>
          </div>

          <button
            onClick={detectLanguage}
            disabled={!detectText.trim() || detecting}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Detect Language
          </button>
        </div>

        {/* Supported Languages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Supported Languages</h2>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Source Languages: {sourceLanguages.length} | Target Languages: {targetLanguages.length}
            </div>
            
            <button
              onClick={() => setShowLanguages(!showLanguages)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showLanguages ? 'Hide' : 'Show'} Language List
            </button>
          </div>

          {showLanguages && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Source Languages</h3>
                <div className="max-h-64 overflow-y-auto border rounded p-2">
                  {sourceLanguages.map(lang => (
                    <div key={lang.language} className="py-1 text-sm">
                      {lang.name} ({lang.language})
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Target Languages</h3>
                <div className="max-h-64 overflow-y-auto border rounded p-2">
                  {targetLanguages.map(lang => (
                    <div key={lang.language} className="py-1 text-sm">
                      {lang.name} ({lang.language})
                      {lang.supports_formality && (
                        <span className="ml-2 text-xs text-green-600">[Formality]</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}