import { supabase } from '../config/supabase';
import { SUPPORTED_LANGUAGES } from '../components/LanguageSelector/LanguageSelector';

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslationContext {
  previousSentences?: string[];
  topic?: string;
  domain?: string;
}

/**
 * Gemini Translation Service
 * 
 * Provides context-aware translation for live captions using Gemini API
 */
export class GeminiTranslationService {
  private apiKey: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Get API key from environment or Supabase
        // In production, this should be stored securely
        this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
      }
    } catch (error) {
      console.error('[Translation] Initialization error:', error);
    }
  }

  /**
   * Detect if text contains complete sentences
   * A sentence is complete if it ends with . ! ? or similar
   */
  hasCompleteSentences(text: string): boolean {
    const sentenceEndings = /[.!?。！？]\s*$/;
    return sentenceEndings.test(text.trim());
  }

  /**
   * Extract complete sentences from text
   * Leaves incomplete sentences for next batch
   */
  extractCompleteSentences(text: string): { complete: string; remaining: string } {
    const sentences = text.split(/(?<=[.!?。！？])\s+/);
    
    // Check if last sentence is complete
    const lastSentence = sentences[sentences.length - 1];
    const isLastComplete = /[.!?。！？]\s*$/.test(lastSentence);
    
    if (isLastComplete) {
      return {
        complete: text.trim(),
        remaining: ''
      };
    } else {
      // Last sentence is incomplete, save it for next batch
      const remaining = sentences.pop() || '';
      const complete = sentences.join(' ').trim();
      return { complete, remaining };
    }
  }

  /**
   * Translate text using Gemini API with context
   */
  async translate(
    text: string,
    targetLanguageCode: string,
    context?: TranslationContext
  ): Promise<TranslationResult> {
    try {
      // Get language name from code
      const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguageCode);
      const targetLanguageName = targetLang?.name || 'English';

      // Build context-aware prompt
      let prompt = this.buildTranslationPrompt(text, targetLanguageName, context);

      // Call Gemini API via Supabase Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_translate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            targetLanguage: targetLanguageName,
            context: context || {},
          }),
        }
      );

      if (!response.ok) {
        // Fallback to direct API call if edge function doesn't exist
        return await this.translateDirect(text, targetLanguageName, prompt);
      }

      const result = await response.json();
      
      return {
        translatedText: result.translation || text,
        sourceLanguage: 'en',
        targetLanguage: targetLanguageCode,
      };
    } catch (error) {
      console.error('[Translation] Error:', error);
      // Return original text on error
      return {
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: targetLanguageCode,
      };
    }
  }

  /**
   * Direct translation using Gemini API
   * Fallback when edge function is not available
   */
  private async translateDirect(
    text: string,
    targetLanguageName: string,
    prompt: string
  ): Promise<TranslationResult> {
    if (!this.apiKey) {
      // If no API key, return original text
      return {
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en',
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3, // Lower temperature for more accurate translations
              maxOutputTokens: 1000,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

      return {
        translatedText: translation,
        sourceLanguage: 'en',
        targetLanguage: targetLanguageName,
      };
    } catch (error) {
      console.error('[Translation] Direct API error:', error);
      return {
        translatedText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en',
      };
    }
  }

  /**
   * Build context-aware translation prompt
   */
  private buildTranslationPrompt(
    text: string,
    targetLanguage: string,
    context?: TranslationContext
  ): string {
    let prompt = `Translate the following English text to ${targetLanguage}. Maintain the natural flow and meaning.`;

    // Add context if provided
    if (context?.previousSentences && context.previousSentences.length > 0) {
      prompt += `\n\nPrevious context:\n${context.previousSentences.join(' ')}`;
    }

    if (context?.topic) {
      prompt += `\n\nTopic: ${context.topic}`;
    }

    if (context?.domain) {
      prompt += `\n\nDomain: ${context.domain}`;
    }

    prompt += `\n\nText to translate:\n${text}`;
    prompt += `\n\nProvide ONLY the translation, no explanations or additional text.`;

    return prompt;
  }

  /**
   * Batch translate multiple sentences with context
   */
  async translateBatch(
    sentences: string[],
    targetLanguageCode: string,
    context?: TranslationContext
  ): Promise<string[]> {
    // For efficiency, translate all sentences together with context
    const combinedText = sentences.join(' ');
    
    const result = await this.translate(combinedText, targetLanguageCode, context);
    
    // Split translated text back into sentences (approximately)
    // This is a simplified approach - in production, might want more sophisticated splitting
    return result.translatedText.split(/(?<=[.!?。！？])\s+/);
  }
}

// Export singleton instance
export const translationService = new GeminiTranslationService();
