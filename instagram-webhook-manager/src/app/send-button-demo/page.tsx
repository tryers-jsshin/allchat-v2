'use client'

import { useState } from 'react'

export default function SendButtonDemo() {
  const [messageText, setMessageText] = useState('안녕하세요')
  const [translationLang, setTranslationLang] = useState('')
  const [showSettings, setShowSettings] = useState<number | null>(null)

  const languages = [
    { code: '', label: '번역 안함', flag: '🇰🇷' },
    { code: 'EN', label: '영어', flag: '🇺🇸' },
    { code: 'JA', label: '일본어', flag: '🇯🇵' },
    { code: 'ZH', label: '중국어', flag: '🇨🇳' },
  ]

  const designs = [
    {
      id: 1,
      name: "Badge Indicator",
      description: "전송 버튼에 번역 언어 뱃지 표시 - 직관적이고 깔끔함",
      render: () => (
        <div className="relative inline-block">
          <button className={`px-5 py-2.5 rounded-full font-medium transition-all ${
            messageText 
              ? translationLang 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400'
          }`}>
            <svg className="w-4 h-4 inline mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            전송
          </button>
          {translationLang && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full">
              {translationLang}
            </span>
          )}
          <button
            onClick={() => setShowSettings(showSettings === 1 ? null : 1)}
            className="absolute -top-1 -left-1 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 text-[10px]"
          >
            ⚙️
          </button>
          {showSettings === 1 && (
            <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border p-2 z-10">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTranslationLang(lang.code)
                    setShowSettings(null)
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${translationLang === lang.code ? 'bg-blue-50 text-blue-600' : ''}`}
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
      name: "Split Button",
      description: "분할 버튼 - 메인 액션과 설정 분리",
      render: () => (
        <div className="inline-flex rounded-full overflow-hidden shadow-sm">
          <button className={`px-4 py-2 font-medium transition-all ${
            messageText 
              ? translationLang 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400'
          }`}>
            {translationLang ? `전송 →${translationLang}` : '전송'}
          </button>
          <button
            onClick={() => setShowSettings(showSettings === 2 ? null : 2)}
            className={`px-2 border-l transition-all ${
              messageText 
                ? translationLang 
                  ? 'bg-green-600 text-white hover:bg-green-700 border-green-400' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-400'
                : 'bg-gray-300 text-gray-500 border-gray-400'
            }`}
          >
            ▼
          </button>
          {showSettings === 2 && (
            <div className="absolute top-full mt-1 bg-white rounded-lg shadow-lg border p-1 z-10">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTranslationLang(lang.code)
                    setShowSettings(null)
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${translationLang === lang.code ? 'bg-blue-50 text-blue-600' : ''}`}
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
      name: "Morphing Button",
      description: "상태에 따라 변형되는 버튼 - 시각적 피드백 강조",
      render: () => (
        <div className="relative inline-block">
          <button className={`px-4 py-2 rounded-full font-medium transition-all transform hover:scale-105 ${
            messageText 
              ? translationLang 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg pl-3 pr-5' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-400'
          }`}>
            <span className="flex items-center gap-2">
              {translationLang && (
                <span className="text-lg">🌐</span>
              )}
              <span>
                {translationLang ? `번역 전송` : '전송'}
              </span>
              {translationLang && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                  {translationLang}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setShowSettings(showSettings === 3 ? null : 3)}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-800 text-xs shadow-md"
          >
            ⚙️
          </button>
          {showSettings === 3 && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border p-2 z-10">
              <p className="text-xs font-medium text-gray-600 px-2 py-1">전송 옵션</p>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTranslationLang(lang.code)
                    setShowSettings(null)
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${translationLang === lang.code ? 'bg-green-50 text-green-600' : ''}`}
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
      id: 4,
      name: "Color Coded",
      description: "색상으로 번역 상태 구분 - 즉각적인 시각 피드백",
      render: () => (
        <div className="relative inline-block group">
          <button className={`relative px-5 py-2.5 rounded-full font-medium transition-all ${
            messageText 
              ? translationLang 
                ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400'
          }`}>
            <span className="relative z-10">
              전송 {translationLang && `• ${translationLang}`}
            </span>
            {translationLang && (
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
            )}
          </button>
          <div className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <select
              value={translationLang}
              onChange={(e) => setTranslationLang(e.target.value)}
              className="text-xs border rounded px-1 py-0.5 bg-white"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>
      )
    },
    {
      id: 5,
      name: "Icon Transform",
      description: "아이콘이 번역 상태를 표현 - 부드러운 전환 효과",
      render: () => (
        <div className="relative inline-block">
          <button 
            className={`group px-4 py-2 rounded-full font-medium transition-all ${
              messageText 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="relative">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                {translationLang && (
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-[8px]">🌐</span>
                  </span>
                )}
              </span>
              <span>전송</span>
            </span>
          </button>
          <button
            onClick={() => setShowSettings(showSettings === 5 ? null : 5)}
            className="absolute top-0 -right-1 w-4 h-4 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 opacity-0 hover:opacity-100 transition-opacity"
            style={{ fontSize: '10px' }}
          >
            ⚙
          </button>
          {showSettings === 5 && (
            <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border p-2 z-10 min-w-[120px]">
              {languages.map(lang => (
                <label key={lang.code} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="radio"
                    name="lang5"
                    value={lang.code}
                    checked={translationLang === lang.code}
                    onChange={(e) => setTranslationLang(e.target.value)}
                    className="text-blue-500"
                  />
                  <span className="text-sm">{lang.flag} {lang.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 6,
      name: "Contextual Tooltip",
      description: "호버 시 스마트 툴팁으로 상태 표시",
      render: () => (
        <div className="relative inline-block group">
          <button className={`px-4 py-2 rounded-lg font-medium transition-all ${
            messageText 
              ? translationLang 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400'
          }`}>
            전송
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {translationLang ? `한국어 → ${languages.find(l => l.code === translationLang)?.label}` : '바로 전송'}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          {/* Settings on hover */}
          <button
            onClick={() => setShowSettings(showSettings === 6 ? null : 6)}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="block w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-xs hover:shadow-lg">
              ⚙️
            </span>
          </button>
          {showSettings === 6 && (
            <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border p-2 z-10">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTranslationLang(lang.code)
                    setShowSettings(null)
                  }}
                  className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded ${translationLang === lang.code ? 'font-medium text-emerald-600' : ''}`}
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
      id: 7,
      name: "Slide Toggle",
      description: "버튼 내장 슬라이드 토글 - 컴팩트한 디자인",
      render: () => (
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
          <div className="flex items-center gap-1 px-2">
            <span className="text-xs text-gray-600">번역</span>
            <button
              onClick={() => setTranslationLang(translationLang ? '' : 'EN')}
              className={`relative w-10 h-5 rounded-full transition-colors ${translationLang ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${translationLang ? 'translate-x-5' : ''}`}></span>
            </button>
            {translationLang && (
              <select
                value={translationLang}
                onChange={(e) => setTranslationLang(e.target.value)}
                className="text-xs border-0 bg-transparent text-green-600 font-medium"
              >
                {languages.filter(l => l.code).map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.code}</option>
                ))}
              </select>
            )}
          </div>
          <button className={`px-4 py-1.5 rounded-full font-medium transition-all ${
            messageText 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-300 text-gray-500'
          }`}>
            전송
          </button>
        </div>
      )
    },
    {
      id: 8,
      name: "Unified Dropdown",
      description: "통합 드롭다운 - 전송과 설정이 하나의 메뉴에",
      render: () => (
        <div className="relative inline-block">
          <button
            onClick={() => setShowSettings(showSettings === 8 ? null : 8)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              messageText 
                ? translationLang 
                  ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <span>전송</span>
            {translationLang && (
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                {translationLang}
              </span>
            )}
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </button>
          {showSettings === 8 && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border overflow-hidden z-10 min-w-[150px]">
              <button className="w-full text-left px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
                📤 바로 전송
              </button>
              <div className="border-t">
                <p className="px-4 py-1 text-xs text-gray-500">번역하여 전송</p>
                {languages.filter(l => l.code).map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setTranslationLang(lang.code)
                      setShowSettings(null)
                    }}
                    className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 ${translationLang === lang.code ? 'bg-green-50 text-green-600' : ''}`}
                  >
                    {lang.flag} {lang.label}로 전송
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 9,
      name: "Smart Indicator",
      description: "스마트 인디케이터 - 미니멀하면서도 명확한 상태 표시",
      render: () => (
        <div className="relative inline-block">
          <button className={`relative px-5 py-2 rounded-full font-medium transition-all overflow-hidden ${
            messageText 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 text-gray-400'
          }`}>
            <span className="relative z-10">전송</span>
            {translationLang && (
              <>
                <span className="absolute top-0 left-0 w-full h-1 bg-green-400"></span>
                <span className="absolute top-1 left-2 text-[8px] text-green-200 font-bold">
                  {translationLang}
                </span>
              </>
            )}
          </button>
          <button
            onMouseEnter={() => setShowSettings(9)}
            onMouseLeave={() => setShowSettings(null)}
            className="absolute -top-1 -right-1 w-4 h-4"
          >
            <span className="block w-full h-full rounded-full bg-gray-600 text-white flex items-center justify-center text-[8px] hover:bg-gray-700">
              ⚙
            </span>
          </button>
          {showSettings === 9 && (
            <div 
              className="absolute bottom-full mb-1 right-0 bg-white rounded-lg shadow-lg border p-1 z-10"
              onMouseEnter={() => setShowSettings(9)}
              onMouseLeave={() => setShowSettings(null)}
            >
              <div className="flex gap-1">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setTranslationLang(lang.code)}
                    className={`px-2 py-1 text-xs rounded ${translationLang === lang.code ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 10,
      name: "Progressive Disclosure",
      description: "점진적 공개 - 필요할 때만 옵션 표시",
      render: () => (
        <div className="inline-flex items-center">
          <button 
            className={`relative px-4 py-2 rounded-l-full font-medium transition-all ${
              messageText 
                ? translationLang 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {translationLang ? (
              <span className="flex items-center gap-1">
                <span>전송</span>
                <span className="text-xs opacity-90">({translationLang})</span>
              </span>
            ) : (
              '전송'
            )}
          </button>
          <button
            onClick={() => setShowSettings(showSettings === 10 ? null : 10)}
            className={`px-2 py-2 rounded-r-full border-l transition-all ${
              messageText 
                ? translationLang 
                  ? 'bg-green-600 text-white hover:bg-green-700 border-green-400' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-400'
                : 'bg-gray-300 text-gray-500 border-gray-400'
            }`}
          >
            <svg className={`w-3 h-3 transition-transform ${showSettings === 10 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </button>
          {showSettings === 10 && (
            <div className="absolute top-full mt-1 bg-white rounded-lg shadow-lg border p-2 z-10">
              <p className="text-xs font-medium text-gray-600 mb-1">전송 모드</p>
              <div className="space-y-1">
                {languages.map(lang => (
                  <label key={lang.code} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="lang10"
                      value={lang.code}
                      checked={translationLang === lang.code}
                      onChange={(e) => {
                        setTranslationLang(e.target.value)
                        setShowSettings(null)
                      }}
                      className="text-blue-500"
                    />
                    <span className="text-sm">{lang.flag} {lang.label}</span>
                  </label>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">통합 전송 버튼 UI 디자인</h1>
          <p className="text-gray-600">번역은 전송의 설정 옵션 - 하나의 통합된 액션으로 표현</p>
        </div>

        {/* Controls */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메시지</label>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="메시지 입력..."
                className="px-3 py-1.5 border rounded-lg text-sm w-48"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">현재 번역 설정</label>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {designs.map((design) => (
            <div key={design.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{design.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{design.description}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">#{design.id}</span>
                </div>
              </div>
              
              <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center min-h-[100px]">
                {design.render()}
              </div>

              {/* States Preview */}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded">기본</span>
                {translationLang && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">번역: {translationLang}</span>}
                {!messageText && <span className="px-2 py-1 bg-red-100 text-red-700 rounded">비활성</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🎯 시니어 UI/UX 디자이너 추천</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥇</span>
                <span className="font-semibold">최고 추천</span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>#1 Badge Indicator</strong><br/>
                직관적이고 공간 효율적. 상태가 명확하게 표시되며 설정 접근이 쉬움.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥈</span>
                <span className="font-semibold">프로페셔널</span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>#2 Split Button</strong><br/>
                기업용 앱에 적합. 명확한 기능 분리와 예측 가능한 UX.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥉</span>
                <span className="font-semibold">모던 트렌디</span>
              </div>
              <p className="text-sm text-gray-700">
                <strong>#3 Morphing Button</strong><br/>
                시각적 임팩트가 강하고 상태 변화가 명확. 젊은 사용자층에 어필.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 핵심 인사이트:</strong> 번역은 전송의 "모드"입니다. 별도 기능이 아닌 전송 방식의 옵션으로 표현하여 
              사용자가 하나의 통합된 액션으로 인지하도록 디자인했습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}