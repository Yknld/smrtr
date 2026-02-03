import { supabase } from '../config/supabase';

export interface GeminiLiveToken {
  token: string;
  expire_time: string;
  new_session_expire_time: string;
  model: string;
}

export interface TranscriptEvent {
  type: 'partial' | 'final' | 'error' | 'connected' | 'disconnected';
  text?: string;
  error?: string;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private token: GeminiLiveToken | null = null;
  private onTranscript: ((event: TranscriptEvent) => void) | null = null;

  constructor(onTranscript: (event: TranscriptEvent) => void) {
    this.onTranscript = onTranscript;
  }

  async connect() {
    // 1. Get ephemeral token from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/gemini_live_token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get Gemini token');
    }

    this.token = await response.json();
    
    // Get token prefix and suffix for safe logging
    const tokenPrefix = this.token.token.substring(0, 14); // "auth_tokens/xx"
    const tokenSuffix = this.token.token.slice(-6);
    console.log(`Got ephemeral token: ${tokenPrefix}...${tokenSuffix}`);

    // 2. Connect to Gemini Live API via WebSocket
    // Ephemeral tokens (starting with "auth_tokens/") MUST use:
    // - BidiGenerateContentConstrained endpoint (not BidiGenerateContent)
    // - access_token query param (not key)
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(this.token.token)}`;
    
    console.log('Connecting to WebSocket:');
    console.log('  Endpoint: BidiGenerateContentConstrained');
    console.log('  Auth: access_token (ephemeral token)');
    console.log(`  Token: ${tokenPrefix}...${tokenSuffix}`);
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected - ephemeral token accepted');
      this.onTranscript?.({ type: 'connected' });
      
      // Ephemeral tokens include liveConnectConstraints, so setup might be minimal
      // But we still need to enable transcription explicitly
      this.sendSetupMessage();
    };

    this.ws.onmessage = (event) => {
      try {
        // Check if message is a string (JSON) or binary (audio)
        if (typeof event.data === 'string') {
          console.log('WebSocket JSON message received');
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (parseError) {
            console.warn('Failed to parse JSON message:', event.data.substring(0, 100));
            console.error('Parse error:', parseError);
          }
        } else {
          // Binary message (likely audio response from Gemini)
          console.log('WebSocket binary message received (audio), ignoring');
          // We don't need audio responses for transcription-only mode
        }
      } catch (error) {
        console.error('WebSocket message handler error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onTranscript?.({ type: 'error', error: 'Connection error' });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
      
      let errorMsg = null;
      
      if (event.code === 1007) {
        // Invalid data / protocol error
        const reason = event.reason || '';
        if (reason.includes('Cannot extract voices') || reason.includes('non-audio')) {
          errorMsg = 'Config error: Live API requires AUDIO responseModalities';
          console.error(errorMsg);
          console.error('  Reason:', event.reason);
        } else {
          errorMsg = 'Auth failed: token used as API key or expired';
          console.error(errorMsg);
          console.error('  Hint: Ephemeral tokens must use BidiGenerateContentConstrained + access_token param');
        }
      } else if (event.code === 1008) {
        // Policy violation / missing auth
        errorMsg = 'Auth missing/invalid: check access_token param or Authorization header';
        console.error(errorMsg);
        console.error('  Hint: Token must be passed via ?access_token= (not ?key=)');
      }
      
      if (errorMsg) {
        this.onTranscript?.({ type: 'error', error: errorMsg });
      } else {
        this.onTranscript?.({ type: 'disconnected' });
      }
    };
  }

  private sendSetupMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // The ephemeral token is configured with:
    // - responseModalities: ["TEXT"] (we want text transcripts)
    // - inputAudioTranscription: {} (enables transcription of our input audio)
    // We can optionally send a setup message, but the token constraints will apply
    const setupMessage = {
      setup: {
        model: this.token?.model || 'models/gemini-3-flash-preview',
      }
    };

    console.log('Sending setup message (token pre-configured for TEXT + inputAudioTranscription)');
    this.ws.send(JSON.stringify(setupMessage));
  }

  private handleMessage(data: any) {
    console.log('Handling message type:', Object.keys(data).join(', '));
    
    // Handle setup acknowledgment
    if (data.setupComplete) {
      console.log('Setup complete:', data.setupComplete);
      return;
    }

    // Handle input audio transcription (this is what we want!)
    // Format: { serverContent: { inputTranscript: { text: "...", isFinal: true/false } } }
    if (data.serverContent?.inputTranscript) {
      const transcript = data.serverContent.inputTranscript;
      const text = transcript.text || '';
      const isFinal = transcript.isFinal || false;
      
      console.log(`Transcript (${isFinal ? 'final' : 'partial'}):`, text);
      
      this.onTranscript?.({
        type: isFinal ? 'final' : 'partial',
        text: text
      });
      return;
    }

    // Handle model turn (Gemini's audio/text response - we can ignore for transcription-only)
    if (data.serverContent?.modelTurn) {
      console.log('Model turn received (ignoring - we only want input transcripts)');
      return;
    }

    // Log unknown message types for debugging
    console.log('Unknown message format:', JSON.stringify(data, null, 2).substring(0, 200));
  }

  sendAudioChunk(audioData: ArrayBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready');
      return;
    }

    // Convert audio to base64
    const base64Audio = this.arrayBufferToBase64(audioData);

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
  }
}
