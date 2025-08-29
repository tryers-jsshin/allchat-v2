'use client'

import { useState } from 'react'

export default function ButtonUIDemo() {
  const [messageText, setMessageText] = useState('안녕하세요')
  const [translationEnabled, setTranslationEnabled] = useState(false)

  const designs = [
    {
      id: 1,
      name: "WhatsApp Style",
      description: "통합된 원형 버튼 - 깔끔하고 모던한 스타일",
      render: () => (
        <div className="flex items-center gap-2">
          <button className={`p-2 rounded-full transition-all ${translationEnabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </button>
          <button className={`p-2.5 rounded-full transition-all ${messageText ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      )
    },
    {
      id: 2,
      name: "Material Design FAB",
      description: "플로팅 액션 버튼 스타일 - Google Material Design",
      render: () => (
        <div className="relative">
          <button className={`px-4 py-2 rounded-full text-sm transition-all ${translationEnabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white text-gray-700 border border-gray-200'} hover:shadow-md`}>
            {translationEnabled ? '🌐 영어로 번역' : '🌐 번역'}
          </button>
          <button className={`ml-2 px-6 py-2.5 rounded-full font-medium transition-all transform hover:scale-105 ${messageText ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
            전송
          </button>
        </div>
      )
    },
    {
      id: 3,
      name: "Slack Style",
      description: "Slack 메신저 스타일 - 깔끔한 사각형 버튼",
      render: () => (
        <div className="flex items-center gap-1">
          <button className={`px-3 py-1.5 rounded transition-all ${translationEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
            <span className="text-sm">A文</span>
          </button>
          <button className={`px-4 py-1.5 rounded font-medium transition-all ${messageText ? 'bg-[#007a5a] text-white hover:bg-[#00664a]' : 'bg-gray-200 text-gray-400'}`}>
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            전송
          </button>
        </div>
      )
    },
    {
      id: 4,
      name: "Telegram Style",
      description: "텔레그램 스타일 - 미니멀하고 둥근 버튼",
      render: () => (
        <div className="flex items-center gap-2">
          <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${translationEnabled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <span className="text-lg">🌐</span>
          </button>
          <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${messageText ? 'bg-[#3390ec] text-white hover:bg-[#2d7cc7]' : 'bg-gray-200 text-gray-400'}`}>
            <svg className="w-5 h-5 transform rotate-45" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      )
    },
    {
      id: 5,
      name: "Discord Style",
      description: "Discord 스타일 - 다크하고 게이머 친화적",
      render: () => (
        <div className="flex items-center gap-2 p-2 bg-[#40444b] rounded-lg">
          <button className={`px-3 py-1.5 rounded transition-all ${translationEnabled ? 'bg-green-600 text-white' : 'bg-[#4f545c] text-gray-300 hover:bg-[#5d6269]'}`}>
            <span className="text-sm font-medium">번역</span>
          </button>
          <button className={`px-4 py-1.5 rounded transition-all ${messageText ? 'bg-[#5865f2] text-white hover:bg-[#4752c4]' : 'bg-[#4f545c] text-gray-500'}`}>
            <span className="text-sm font-medium">전송</span>
          </button>
        </div>
      )
    },
    {
      id: 6,
      name: "iMessage Style",
      description: "Apple iMessage 스타일 - 깔끔하고 미니멀",
      render: () => (
        <div className="flex items-center gap-2">
          <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${translationEnabled ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </button>
          <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${messageText ? 'bg-[#007AFF] text-white' : 'bg-gray-200 text-gray-400'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      )
    },
    {
      id: 7,
      name: "Notion Style",
      description: "Notion 스타일 - 극도로 미니멀하고 우아함",
      render: () => (
        <div className="flex items-center gap-1">
          <button className={`px-2 py-1 rounded text-sm transition-all ${translationEnabled ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}>
            번역
          </button>
          <div className="w-px h-4 bg-gray-200"></div>
          <button className={`px-3 py-1 rounded text-sm font-medium transition-all ${messageText ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300'}`}>
            전송 →
          </button>
        </div>
      )
    },
    {
      id: 8,
      name: "Linear Style",
      description: "Linear 앱 스타일 - 테크니컬하고 정교함",
      render: () => (
        <div className="flex items-center gap-1.5">
          <button className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${translationEnabled ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            <span className="mr-1">🌐</span>
            KO→EN
          </button>
          <button className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${messageText ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
            Send
            <svg className="w-3 h-3 inline ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>
      )
    },
    {
      id: 9,
      name: "Spotify Style",
      description: "Spotify 스타일 - 대담하고 활기찬 디자인",
      render: () => (
        <div className="flex items-center gap-2 bg-black p-2 rounded-lg">
          <button className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${translationEnabled ? 'bg-[#1DB954] text-white' : 'bg-[#282828] text-gray-400 hover:text-white'}`}>
            번역 ON
          </button>
          <button className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${messageText ? 'bg-white text-black hover:scale-105' : 'bg-[#282828] text-gray-600'}`}>
            Send
          </button>
        </div>
      )
    },
    {
      id: 10,
      name: "Minimal Elegant",
      description: "미니멀 엘레강트 - 세련되고 모던한 디자인",
      render: () => (
        <div className="inline-flex items-center bg-gray-50 rounded-full p-1">
          <button 
            className={`px-3 py-1.5 rounded-full text-sm transition-all ${translationEnabled ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            번역
          </button>
          <button 
            className={`ml-1 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${messageText ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400'}`}
          >
            전송
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">전송 버튼 UI 디자인 데모</h1>
          <p className="text-gray-600">시니어 UI/UX 디자이너 관점에서 디자인한 10가지 버튼 조합</p>
        </div>

        {/* Controls */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={translationEnabled}
                onChange={(e) => setTranslationEnabled(e.target.checked)}
                className="rounded text-blue-500"
              />
              <span className="text-sm text-gray-700">번역 활성화</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="메시지 입력..."
                className="px-3 py-1 border rounded text-sm"
              />
            </label>
          </div>
        </div>

        {/* Design Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {designs.map((design) => (
            <div key={design.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{design.name}</h3>
                <p className="text-sm text-gray-600">{design.description}</p>
              </div>
              
              {/* Light Mode */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Light Mode</p>
                <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-center">
                  {design.render()}
                </div>
              </div>
              
              {/* Dark Mode Preview */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Dark Mode</p>
                <div className="p-4 bg-gray-900 rounded-lg flex items-center justify-center">
                  {design.render()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">🎨 디자인 추천</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>최고 추천:</strong> #1 WhatsApp Style - 사용자 친숙도가 높고 깔끔함</p>
            <p><strong>모던한 선택:</strong> #10 Minimal Elegant - 세련되고 공간 효율적</p>
            <p><strong>프로페셔널:</strong> #8 Linear Style - 비즈니스 앱에 적합</p>
          </div>
        </div>
      </div>
    </div>
  )
}