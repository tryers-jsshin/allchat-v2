import { NextRequest, NextResponse } from 'next/server'
import { getDeepLClient } from '@/lib/deepl-client'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, targetLang, sourceLang, messageId, options } = body

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
        { status: 400 }
      )
    }

    // Check cache if messageId is provided
    if (messageId) {
      // First check for active translation
      const { data: existing } = await supabase
        .from('translations')
        .select('translated_text')
        .eq('message_id', messageId)
        .eq('target_lang', targetLang.toUpperCase())
        .eq('is_deleted', false)
        .single()
      
      if (existing) {
        // Return cached translation without calling DeepL API
        return NextResponse.json({
          success: true,
          result: { text: existing.translated_text },
          fromCache: true,
          timestamp: new Date().toISOString()
        })
      }

      // Check for deleted translation to reactivate
      const { data: deletedTranslation } = await supabase
        .from('translations')
        .select('id, translated_text')
        .eq('message_id', messageId)
        .eq('target_lang', targetLang.toUpperCase())
        .eq('is_deleted', true)
        .single()
      
      if (deletedTranslation) {
        // Reactivate immediately without calling DeepL API
        await supabase
          .from('translations')
          .update({
            is_deleted: false,
            deleted_at: null
          })
          .eq('id', deletedTranslation.id)
        
        // Return the existing translation
        return NextResponse.json({
          success: true,
          result: { text: deletedTranslation.translated_text },
          fromCache: true,
          reactivated: true,
          timestamp: new Date().toISOString()
        })
      }
    }

    // No cache found, call DeepL API
    const client = getDeepLClient()
    const startTime = Date.now()
    
    const result = await client.translate(text, targetLang, {
      source_lang: sourceLang,
      ...options
    })
    
    const responseTime = Date.now() - startTime

    // Save to database if messageId is provided
    if (messageId) {
      // Create new translation (reactivation is handled above)
      await supabase
        .from('translations')
        .insert({
          message_id: messageId,
          original_text: text,
          translated_text: result.text,
          source_lang: result.detected_source_language,
          target_lang: targetLang.toUpperCase(),
          translation_provider: 'deepl',
          response_time_ms: responseTime,
          character_count: text.length,
          is_deleted: false
        })
    }

    return NextResponse.json({
      success: true,
      result,
      responseTime,
      fromCache: false,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed' 
      },
      { status: 500 }
    )
  }
}

// Batch translation endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { texts, targetLang, sourceLang, options } = body

    if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLang) {
      return NextResponse.json(
        { error: 'Texts array and target language are required' },
        { status: 400 }
      )
    }

    const client = getDeepLClient()
    const startTime = Date.now()
    
    const results = await client.translateBatch(texts, targetLang, {
      source_lang: sourceLang,
      ...options
    })
    
    const responseTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      results,
      responseTime,
      count: results.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Batch translation failed' 
      },
      { status: 500 }
    )
  }
}