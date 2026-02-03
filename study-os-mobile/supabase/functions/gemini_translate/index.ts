import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = 'gemini-3-flash-preview'

interface TranslationRequest {
  text: string
  targetLanguage: string
  context?: {
    previousSentences?: string[]
    topic?: string
    domain?: string
  }
}

interface TranslationResponse {
  translation: string
  sourceLanguage: string
  targetLanguage: string
  error?: string
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client to verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if Gemini API key is configured
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: TranslationRequest = await req.json()
    const { text, targetLanguage, context } = body

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text and targetLanguage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build context-aware translation prompt
    let prompt = `Translate the following English text to ${targetLanguage}. Maintain the natural flow and meaning.`

    // Add context if provided
    if (context?.previousSentences && context.previousSentences.length > 0) {
      prompt += `\n\nPrevious context:\n${context.previousSentences.join(' ')}`
    }

    if (context?.topic) {
      prompt += `\n\nTopic: ${context.topic}`
    }

    if (context?.domain) {
      prompt += `\n\nDomain: ${context.domain}`
    }

    prompt += `\n\nText to translate:\n${text}`
    prompt += `\n\nProvide ONLY the translation, no explanations or additional text.`

    console.log(`[Translation] User: ${user.id}, Target: ${targetLanguage}, Length: ${text.length}`)

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more accurate translations
            maxOutputTokens: 2000,
            topP: 0.8,
            topK: 10,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('[Translation] Gemini API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Translation service error',
          translation: text, // Return original text as fallback
          sourceLanguage: 'en',
          targetLanguage: targetLanguage,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    const translation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text

    // Return translation
    const response: TranslationResponse = {
      translation,
      sourceLanguage: 'en',
      targetLanguage: targetLanguage,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Translation] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        translation: '', // Empty on error
        sourceLanguage: 'en',
        targetLanguage: 'en',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
