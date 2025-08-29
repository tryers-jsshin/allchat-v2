'use client'

import { useState } from 'react'

export default function MessageInputDemo() {
  const [messageText, setMessageText] = useState('')
  const [translationLang, setTranslationLang] = useState('')
  const [showSettings, setShowSettings] = useState<number | null>(null)
  const [attachmentOpen, setAttachmentOpen] = useState(false)

  const languages = [
    { code: '', label: '번역 안함', flag: '🇰🇷' },
    { code: 'EN', label: '영어', flag: '🇺🇸' },
    { code: 'JA', label: '일본어', flag: '🇯🇵' },
    { code: 'ZH', label: '중국어', flag: '🇨🇳' },
    { code: 'ES', label: '스페인어', flag: '🇪🇸' },
    { code: 'FR', label: '프랑스어', flag: '🇫🇷' },
  ]

  const getPlaceholder = (lang: string) => {
    if (!lang) return '메시지 입력...'
    const langName = languages.find(l => l.code === lang)?.label
    return `메시지 입력... (${langName}로 번역됩니다)`
  }

  const designs = [
    {
      id: 1,
      name: "WhatsApp Pro",
      description: "WhatsApp 스타일 개선판 - 가장 친숙하고 직관적",
      render: () => (
        <div className="w-full">
          <div className={`flex items-end gap-2 p-3 rounded-2xl transition-all ${
            translationLang ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
          }`}>
            {/* Attachment Button */}
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            {/* Input Field */}
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={getPlaceholder(translationLang)}
              className={`flex-1 px-3 py-2 text-sm bg-transparent outline-none transition-colors ${
                translationLang ? 'placeholder-green-600' : 'placeholder-gray-400'
              }`}
            />
            
            {/* Send Button with Translation Badge */}
            <div className="relative">
              <button className={`p-2 rounded-full transition-all ${
                messageText 
                  ? translationLang 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
              {translationLang && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[9px] font-bold">
                  {translationLang}
                </span>
              )}
              <button
                onClick={() => setShowSettings(showSettings === 1 ? null : 1)}
                className="absolute -bottom-1 -left-1 w-4 h-4 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700"
                style={{ fontSize: '10px' }}
              >
                ⚙
              </button>
            </div>
          </div>
          
          {/* Settings Dropdown */}
          {showSettings === 1 && (
            <div className="mt-2 p-2 bg-white rounded-lg shadow-lg border">
              <p className="text-xs font-medium text-gray-600 px-2 mb-1">번역 설정</p>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTranslationLang(lang.code)
                    setShowSettings(null)
                  }}
                  className={`block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded ${
                    translationLang === lang.code ? 'bg-green-50 text-green-600' : ''
                  }`}
                >
                  {lang.flag} {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 2,
      name: "Slack Workspace",
      description: "Slack 비즈니스 스타일 - 전문적이고 효율적",
      render: () => (
        <div className="w-full">
          {/* Translation Banner */}
          {translationLang && (
            <div className="mb-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex items-center justify-between">
              <span className="text-xs text-green-700">
                🌐 메시지가 {languages.find(l => l.code === translationLang)?.label}로 번역되어 전송됩니다
              </span>
              <button 
                onClick={() => setTranslationLang('')}
                className="text-green-700 hover:text-green-900"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* Input Area */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="flex items-center p-2 bg-white">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getPlaceholder(translationLang)}
                className="flex-1 px-2 py-1 text-sm outline-none"
              />
            </div>
            
            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-t">
              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button 
                  onClick={() => setShowSettings(showSettings === 2 ? null : 2)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    translationLang ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  A文
                </button>
              </div>
              <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                messageText 
                  ? 'bg-[#007a5a] text-white hover:bg-[#00664a]' 
                  : 'bg-gray-200 text-gray-400'
              }`}>
                전송
              </button>
            </div>
          </div>
          
          {/* Settings Dropdown */}
          {showSettings === 2 && (
            <div className="mt-2 p-2 bg-white rounded-lg shadow-lg border">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTranslationLang(lang.code)
                    setShowSettings(null)
                  }}
                  className={`block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded ${
                    translationLang === lang.code ? 'bg-green-50 text-green-600' : ''
                  }`}
                >
                  {lang.flag} {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 3,
      name: "Telegram Advanced",
      description: "텔레그램 고급 버전 - 깔끔하고 모던한 디자인",
      render: () => (
        <div className="w-full">
          <div className={`flex items-end gap-2 p-2 rounded-2xl transition-all ${
            translationLang 
              ? 'bg-gradient-to-r from-blue-50 to-green-50 border-2 border-green-300' 
              : 'bg-white border-2 border-gray-200'
          }`}>
            {/* Attachment */}
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            {/* Input with floating indicator */}
            <div className="flex-1 relative">
              {translationLang && (
                <span className="absolute -top-5 left-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                  {languages.find(l => l.code === translationLang)?.flag} {translationLang}
                </span>
              )}
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getPlaceholder(translationLang)}
                className="w-full px-3 py-2 text-sm bg-transparent outline-none"
              />
            </div>
            
            {/* Voice/Translation Toggle */}
            <button 
              onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
              className={`p-2 rounded-full transition-colors ${
                translationLang ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">🌐</span>
            </button>
            
            {/* Send */}
            <button className={`p-2 rounded-full transition-all ${
              messageText 
                ? 'bg-[#3390ec] text-white hover:bg-[#2d7cc7]' 
                : 'bg-gray-200 text-gray-400'
            }`}>
              <svg className="w-5 h-5 transform rotate-45" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )
    },
    {
      id: 4,
      name: "Discord Nitro",
      description: "Discord 프리미엄 스타일 - 게이머 친화적 다크 테마",
      render: () => (
        <div className="w-full">
          <div className={`p-3 rounded-lg transition-all ${
            translationLang 
              ? 'bg-[#2b2d31] border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
              : 'bg-[#40444b] border-2 border-transparent'
          }`}>
            <div className="flex items-center gap-2">
              {/* Plus Button */}
              <button className="p-2 rounded-full bg-[#4f545c] text-gray-300 hover:bg-[#5d6269] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {/* Input */}
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getPlaceholder(translationLang)}
                className={`flex-1 px-3 py-2 text-sm bg-transparent text-gray-100 outline-none ${
                  translationLang ? 'placeholder-green-400' : 'placeholder-gray-500'
                }`}
              />
              
              {/* Emoji/GIF/Translation */}
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors">
                  😊
                </button>
                <button 
                  onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    translationLang 
                      ? 'bg-green-600 text-white' 
                      : 'bg-[#4f545c] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  번역
                </button>
                <button className={`px-3 py-1.5 rounded transition-colors ${
                  messageText 
                    ? 'bg-[#5865f2] text-white hover:bg-[#4752c4]' 
                    : 'bg-[#4f545c] text-gray-500'
                }`}>
                  전송
                </button>
              </div>
            </div>
            
            {/* Translation indicator */}
            {translationLang && (
              <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                번역 모드: {languages.find(l => l.code === translationLang)?.label}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 5,
      name: "Linear Clean",
      description: "Linear 미니멀 스타일 - 극도로 깔끔한 디자인",
      render: () => (
        <div className="w-full">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Status Bar */}
            {translationLang && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-purple-200">
                <span className="text-xs font-mono text-purple-700">
                  TRANSLATE: KO → {translationLang}
                </span>
              </div>
            )}
            
            {/* Input Area */}
            <div className="flex items-center p-2 bg-white">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getPlaceholder(translationLang)}
                className={`flex-1 px-2 py-1 text-sm font-mono outline-none ${
                  translationLang ? 'text-purple-900' : 'text-gray-900'
                }`}
              />
              <button 
                onClick={() => setShowSettings(showSettings === 5 ? null : 5)}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  translationLang 
                    ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                {translationLang || 'LANG'}
              </button>
              <button className={`ml-2 px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                messageText 
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                SEND →
              </button>
            </div>
          </div>
          
          {/* Language Selector */}
          {showSettings === 5 && (
            <div className="mt-2 p-1 bg-white rounded border border-gray-200 shadow-sm">
              <div className="grid grid-cols-3 gap-1">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setTranslationLang(lang.code)
                      setShowSettings(null)
                    }}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      translationLang === lang.code 
                        ? 'bg-purple-500 text-white' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {lang.code || 'OFF'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 6,
      name: "Notion Minimal",
      description: "Notion 스타일 - 테두리 없는 울트라 미니멀",
      render: () => (
        <div className="w-full group">
          <div className={`relative transition-all ${
            translationLang ? 'pl-4 border-l-2 border-green-400' : ''
          }`}>
            {/* Translation Label */}
            {translationLang && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full mr-2 text-xs text-green-600 font-medium">
                {translationLang}
              </span>
            )}
            
            {/* Main Input Area */}
            <div className="flex items-center gap-2">
              <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={translationLang ? `/${translationLang.toLowerCase()} ${getPlaceholder(translationLang)}` : '메시지를 입력하세요...'}
                className="flex-1 py-2 text-sm outline-none bg-transparent"
              />
              <button 
                onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
                className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition-all"
              >
                번역
              </button>
              <button className={`px-3 py-1 text-sm rounded transition-all ${
                messageText 
                  ? 'text-blue-600 hover:bg-blue-50' 
                  : 'text-gray-300'
              }`}>
                전송 →
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 7,
      name: "Apple Messages",
      description: "iMessage 스타일 - iOS 네이티브 느낌",
      render: () => (
        <div className="w-full">
          <div className={`flex items-end gap-2 p-2 rounded-2xl transition-all ${
            translationLang 
              ? 'bg-green-50 shadow-sm' 
              : 'bg-gray-100'
          }`}>
            {/* Camera/Photo */}
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* Input Field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getPlaceholder(translationLang)}
                className={`w-full px-3 py-2 rounded-full text-sm outline-none transition-colors ${
                  translationLang 
                    ? 'bg-white border border-green-300 placeholder-green-600' 
                    : 'bg-white border border-gray-300 placeholder-gray-400'
                }`}
              />
              {translationLang && (
                <button 
                  onClick={() => setTranslationLang('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full"
                >
                  {translationLang}
                </button>
              )}
            </div>
            
            {/* Send Button */}
            <button className={`p-2 rounded-full transition-all ${
              messageText 
                ? translationLang 
                  ? 'bg-green-500 text-white' 
                  : 'bg-[#007AFF] text-white'
                : 'bg-gray-300 text-gray-500'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
          
          {/* App Bar */}
          <div className="mt-2 flex justify-center gap-4">
            <button className="text-gray-400 hover:text-[#007AFF] transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h16v12H5.17L4 17.17V4m0-2c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"/>
              </svg>
            </button>
            <button 
              onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
              className={`transition-colors ${
                translationLang ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </button>
          </div>
        </div>
      )
    },
    {
      id: 8,
      name: "Material You",
      description: "Google Material 3 - 다이나믹 컬러와 입체감",
      render: () => (
        <div className="w-full">
          <div className={`rounded-3xl overflow-hidden shadow-lg transition-all ${
            translationLang 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50' 
              : 'bg-white'
          }`}>
            <div className="p-3">
              <div className="flex items-center gap-2">
                {/* FAB-style attachment */}
                <button className="p-2.5 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                
                {/* Input with Material elevation */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={getPlaceholder(translationLang)}
                    className={`w-full px-4 py-2.5 rounded-2xl text-sm outline-none transition-all ${
                      translationLang 
                        ? 'bg-white shadow-md placeholder-green-600' 
                        : 'bg-gray-50 placeholder-gray-400'
                    }`}
                  />
                  {translationLang && (
                    <div className="absolute -top-2 right-3 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full shadow-sm">
                      {languages.find(l => l.code === translationLang)?.flag} {translationLang}
                    </div>
                  )}
                </div>
                
                {/* Extended FAB Send */}
                <button className={`px-4 py-2.5 rounded-2xl font-medium transition-all transform hover:scale-105 ${
                  messageText 
                    ? translationLang 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    전송
                  </span>
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="px-3 pb-2 flex gap-2">
              <button 
                onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  translationLang 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🌐 번역
              </button>
              <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors">
                📷 사진
              </button>
              <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors">
                📎 파일
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 9,
      name: "Spotify Social",
      description: "Spotify 소셜 스타일 - 대담하고 활기찬 디자인",
      render: () => (
        <div className="w-full">
          <div className={`p-3 rounded-2xl transition-all ${
            translationLang 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
              : 'bg-black'
          }`}>
            <div className="flex items-center gap-2">
              {/* Attachment */}
              <button className="p-2 bg-[#282828] text-gray-400 rounded-full hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {/* Input */}
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={getPlaceholder(translationLang)}
                className={`flex-1 px-3 py-2 rounded-full text-sm outline-none transition-colors ${
                  translationLang 
                    ? 'bg-white/90 text-black placeholder-green-700' 
                    : 'bg-[#282828] text-white placeholder-gray-500'
                }`}
              />
              
              {/* Translation Toggle */}
              <button 
                onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  translationLang 
                    ? 'bg-white text-green-600' 
                    : 'bg-[#282828] text-gray-400 hover:text-white'
                }`}
              >
                {translationLang || 'LANG'}
              </button>
              
              {/* Send */}
              <button className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-105 ${
                messageText 
                  ? translationLang 
                    ? 'bg-white text-black' 
                    : 'bg-[#1DB954] text-white'
                  : 'bg-[#282828] text-gray-600'
              }`}>
                Send
              </button>
            </div>
            
            {/* Now Playing Style Status */}
            {translationLang && (
              <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
                <span className="flex gap-1">
                  <span className="w-1 h-3 bg-white/60 rounded animate-pulse"></span>
                  <span className="w-1 h-3 bg-white/60 rounded animate-pulse delay-75"></span>
                  <span className="w-1 h-3 bg-white/60 rounded animate-pulse delay-150"></span>
                </span>
                <span>번역 중 • {languages.find(l => l.code === translationLang)?.label}</span>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 10,
      name: "Microsoft Teams",
      description: "Teams 엔터프라이즈 - 비즈니스 친화적",
      render: () => (
        <div className="w-full">
          {/* Translation Status Bar */}
          {translationLang && (
            <div className="mb-2 px-3 py-2 bg-purple-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  🌐 자동 번역 활성화: {languages.find(l => l.code === translationLang)?.label}
                </span>
                <button 
                  onClick={() => setTranslationLang('')}
                  className="text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Main Input Area */}
          <div className={`border-2 ${translationLang ? 'border-purple-300 rounded-b-lg' : 'border-gray-300 rounded-lg'} overflow-hidden`}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 border-b">
              <button className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-300"></div>
              <button className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors">
                B
              </button>
              <button className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors italic">
                I
              </button>
              <div className="w-px h-5 bg-gray-300"></div>
              <button 
                onClick={() => setShowSettings(showSettings === 10 ? null : 10)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  translationLang 
                    ? 'bg-purple-100 text-purple-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                A文 번역
              </button>
            </div>
            
            {/* Text Area */}
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={getPlaceholder(translationLang)}
              className={`w-full px-3 py-2 text-sm resize-none outline-none ${
                translationLang ? 'bg-purple-50' : 'bg-white'
              }`}
              rows={2}
            />
            
            {/* Bottom Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t">
              <div className="flex items-center gap-2">
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  😊
                </button>
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
                  GIF
                </button>
              </div>
              <button className={`px-4 py-1.5 rounded font-medium transition-colors ${
                messageText 
                  ? translationLang 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-[#5B5FC7] text-white hover:bg-[#4B4FB7]'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  전송
                </span>
              </button>
            </div>
          </div>
          
          {/* Language Selector */}
          {showSettings === 10 && (
            <div className="mt-2 p-2 bg-white rounded-lg shadow-lg border">
              <p className="text-xs font-medium text-gray-600 mb-2">번역 언어 선택</p>
              <div className="grid grid-cols-2 gap-1">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setTranslationLang(lang.code)
                      setShowSettings(null)
                    }}
                    className={`px-3 py-1.5 text-sm rounded hover:bg-gray-100 ${
                      translationLang === lang.code ? 'bg-purple-100 text-purple-700' : ''
                    }`}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">완전한 메시지 입력 UI 디자인</h1>
          <p className="text-gray-600">첨부파일 + 입력창 + 전송(번역) 버튼 통합 디자인</p>
        </div>

        {/* Global Controls */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">테스트 메시지</label>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="메시지 입력..."
                className="px-3 py-1.5 border rounded-lg text-sm w-64"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">번역 언어</label>
              <select
                value={translationLang}
                onChange={(e) => setTranslationLang(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Design Examples */}
        <div className="space-y-8">
          {designs.map((design) => (
            <div key={design.id} className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{design.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{design.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    #{design.id}
                  </span>
                </div>
              </div>
              
              <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100">
                {design.render()}
              </div>

              {/* Features */}
              <div className="p-4 flex items-center gap-3 text-xs border-t">
                <span className="text-gray-500">특징:</span>
                {messageText && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">메시지 입력됨</span>}
                {translationLang && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">번역: {translationLang}</span>}
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">첨부파일 지원</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 시니어 UI/UX 디자이너 추천</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥇</span>
                <span className="font-semibold">최고 추천</span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>#1 WhatsApp Pro</strong><br/>
                가장 친숙한 UI. 번역 상태가 전체 입력 영역에 시각적으로 잘 반영됨.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥈</span>
                <span className="font-semibold">비즈니스</span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>#2 Slack Workspace</strong><br/>
                전문적인 업무 환경에 최적. 명확한 번역 상태 표시와 효율적인 레이아웃.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥉</span>
                <span className="font-semibold">모던 트렌드</span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>#8 Material You</strong><br/>
                최신 디자인 트렌드 반영. 다이나믹한 색상과 입체적인 디자인.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 핵심 인사이트:</strong> 번역 설정이 활성화되면 입력창 전체의 시각적 상태가 변화하여 
              사용자가 현재 모드를 명확히 인지할 수 있도록 디자인했습니다. 플레이스홀더 텍스트 변경과 
              색상 변화를 통해 번역 모드임을 강조합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}