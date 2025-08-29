/**
 * DeepL API Client
 * Handles all interactions with DeepL Translation API
 */

export interface TranslationResult {
  text: string
  detected_source_language?: string
}

export interface LanguageInfo {
  language: string
  name: string
  supports_formality?: boolean
}

export interface UsageInfo {
  character_count: number
  character_limit: number
}

export interface TranslateOptions {
  source_lang?: string
  target_lang: string
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less'
  preserve_formatting?: boolean
  tag_handling?: 'xml' | 'html'
  split_sentences?: '0' | '1' | 'nonewlines'
  outline_detection?: boolean
  glossary_id?: string
}

class DeepLClient {
  private apiKey: string
  private apiUrl: string
  private isFreePlan: boolean

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPL_API_KEY || ''
    
    if (!this.apiKey) {
      throw new Error('DeepL API key is required')
    }

    // Detect if it's a free plan API key (ends with :fx)
    this.isFreePlan = this.apiKey.endsWith(':fx')
    
    // Set API URL based on plan type
    this.apiUrl = this.isFreePlan 
      ? 'https://api-free.deepl.com/v2'
      : 'https://api.deepl.com/v2'
  }

  /**
   * Get API plan type
   */
  getPlanType(): 'free' | 'pro' {
    return this.isFreePlan ? 'free' : 'pro'
  }

  /**
   * Translate a single text
   */
  async translate(
    text: string,
    targetLang: string,
    options?: Partial<TranslateOptions>
  ): Promise<TranslationResult> {
    const response = await fetch(`${this.apiUrl}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase(),
        source_lang: options?.source_lang?.toUpperCase(),
        formality: options?.formality,
        preserve_formatting: options?.preserve_formatting,
        tag_handling: options?.tag_handling,
        split_sentences: options?.split_sentences,
        outline_detection: options?.outline_detection,
        glossary_id: options?.glossary_id,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepL API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      text: data.translations[0].text,
      detected_source_language: data.translations[0].detected_source_language,
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    targetLang: string,
    options?: Partial<TranslateOptions>
  ): Promise<TranslationResult[]> {
    if (texts.length === 0) {
      return []
    }

    if (texts.length > 50) {
      throw new Error('Maximum 50 texts can be translated in a single batch')
    }

    const response = await fetch(`${this.apiUrl}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: texts,
        target_lang: targetLang.toUpperCase(),
        source_lang: options?.source_lang?.toUpperCase(),
        formality: options?.formality,
        preserve_formatting: options?.preserve_formatting,
        tag_handling: options?.tag_handling,
        split_sentences: options?.split_sentences,
        outline_detection: options?.outline_detection,
        glossary_id: options?.glossary_id,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepL API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.translations.map((t: any) => ({
      text: t.text,
      detected_source_language: t.detected_source_language,
    }))
  }

  /**
   * Detect the language of a text
   */
  async detectLanguage(text: string): Promise<string> {
    // DeepL doesn't have a separate language detection endpoint
    // We'll use translate with a dummy target language to detect source
    const result = await this.translate(text, 'EN', { source_lang: undefined })
    return result.detected_source_language || 'UNKNOWN'
  }

  /**
   * Get list of supported source languages
   */
  async getSourceLanguages(): Promise<LanguageInfo[]> {
    const response = await fetch(`${this.apiUrl}/languages?type=source`, {
      method: 'GET',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepL API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.map((lang: any) => ({
      language: lang.language,
      name: lang.name,
    }))
  }

  /**
   * Get list of supported target languages
   */
  async getTargetLanguages(): Promise<LanguageInfo[]> {
    const response = await fetch(`${this.apiUrl}/languages?type=target`, {
      method: 'GET',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepL API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.map((lang: any) => ({
      language: lang.language,
      name: lang.name,
      supports_formality: lang.supports_formality,
    }))
  }

  /**
   * Get API usage information
   */
  async getUsage(): Promise<UsageInfo> {
    const response = await fetch(`${this.apiUrl}/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepL API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      character_count: data.character_count,
      character_limit: data.character_limit,
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{
    success: boolean
    planType: 'free' | 'pro'
    usage?: UsageInfo
    error?: string
  }> {
    try {
      const usage = await this.getUsage()
      return {
        success: true,
        planType: this.getPlanType(),
        usage,
      }
    } catch (error) {
      return {
        success: false,
        planType: this.getPlanType(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// Export singleton instance
let deepLClient: DeepLClient | null = null

export function getDeepLClient(apiKey?: string): DeepLClient {
  if (!deepLClient || apiKey) {
    deepLClient = new DeepLClient(apiKey)
  }
  return deepLClient
}

export default DeepLClient