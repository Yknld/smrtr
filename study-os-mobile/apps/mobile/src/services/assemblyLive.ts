import { supabase } from '../config/supabase';
import AudioRecord from 'react-native-audio-record';
import { decode as base64Decode } from 'base-64';
import { Platform } from 'react-native';

// AssemblyAI API key is now handled by the backend for security
// The backend returns a temporary token for each session

export interface TranscriptEvent {
  type: 'partial' | 'final' | 'error' | 'connected' | 'disconnected';
  text?: string;
  error?: string;
}

export interface AssemblyAISessionInfo {
  session_id: string;
  assemblyai_ws_url: string;
  assemblyai_token: string;
  expires_at: string;
}

/**
 * AssemblyAI Real-time Streaming Transcription Service
 * 
 * Features:
 * - TRUE live transcription with partials and finals
 * - Direct WebSocket connection to AssemblyAI
 * - No backend audio proxying
 * - Streams PCM16 mono 16kHz audio
 */
export class AssemblyLiveService {
  private ws: WebSocket | null = null;
  private sessionInfo: AssemblyAISessionInfo | null = null;
  private onTranscript: ((event: TranscriptEvent) => void) | null = null;
  private isRecording = false;
  private audioBuffer: Uint8Array[] = [];
  private readonly MIN_CHUNK_SIZE = 1600; // 50ms at 16kHz 16-bit mono (16000 * 0.05 * 2)
  private turns: { [key: number]: string } = {}; // Store turns by turn_order (like official example)
  private lastEmittedTurn: number = -1; // Track last turn we emitted

  constructor(onTranscript: (event: TranscriptEvent) => void) {
    this.onTranscript = onTranscript;
  }

  /**
   * Start the transcription session
   * 1. Create session in Supabase via backend
   * 2. Connect to AssemblyAI WebSocket
   * 3. Start streaming audio
   */
  async start() {
    try {
      console.log('🔍 Starting AssemblyAI transcription...');
      
      // Step 1: Get Supabase session
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !data.session) {
        throw new Error('Not authenticated. Please sign in.');
      }
      
      const session = data.session;
      console.log('✅ Authenticated as:', session.user?.email);
      
      // Step 2: Call backend to create transcription session
      console.log('📞 Calling backend /transcribe_start...');
      const response = await fetch(
        'https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/transcribe_start',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'assemblyai',
            language: 'en-US',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Backend error: ${response.status}`);
      }

      const backendData = await response.json();
      console.log('✅ Backend session created:', backendData.session_id);
      console.log('✅ AssemblyAI WebSocket URL ready');
      
      // Step 3: Store session info (backend already provided token and URL)
      this.sessionInfo = {
        session_id: backendData.session_id,
        assemblyai_token: backendData.assemblyai_token,
        assemblyai_ws_url: backendData.assemblyai_ws_url,
        expires_at: backendData.expires_at
      };
      
      console.log('📝 Session ready:', this.sessionInfo.session_id);

      // Step 4: Connect to AssemblyAI WebSocket
      await this.connectWebSocket();

      // Step 5: Start audio recording and streaming
      await this.startAudioStreaming();

    } catch (error) {
      console.error('Failed to start AssemblyAI transcription:', error);
      this.onTranscript?.({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to start' 
      });
      throw error;
    }
  }

  /**
   * Connect to AssemblyAI WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.sessionInfo) {
        reject(new Error('No session info'));
        return;
      }

      if (!this.sessionInfo.assemblyai_ws_url) {
        reject(new Error('AssemblyAI WebSocket URL not provided'));
        return;
      }

      console.log('Connecting to AssemblyAI WebSocket...');
      console.log('Session ID:', this.sessionInfo.session_id);

      this.ws = new WebSocket(this.sessionInfo.assemblyai_ws_url);

      // Set up event handlers
      this.ws.onopen = () => {
        console.log('✅ AssemblyAI WebSocket connected (v3 universal streaming)');
        
        // Connection is authenticated via URL - ready to stream audio
        this.onTranscript?.({ type: 'connected' });
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        this.onTranscript?.({ type: 'error', error: 'Connection error' });
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('AssemblyAI WebSocket closed:', event.code, event.reason);
        this.onTranscript?.({ type: 'disconnected' });
        this.isRecording = false;
      };

      // Timeout if connection takes too long
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming WebSocket messages from AssemblyAI
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('📥 Received message:', JSON.stringify(data).substring(0, 200));
      
      // v3 universal streaming uses 'type'
      const messageType = data.type;
      
      // Handle session begins (v3)
      if (messageType === 'Begin') {
        console.log('✅ AssemblyAI session begun:', data.id);
        console.log('🎙️ Ready to stream audio');
        return;
      }
      
      // Handle errors
      if (data.error) {
        console.error('❌ AssemblyAI error:', data.error);
        this.onTranscript?.({ type: 'error', error: data.error });
        return;
      }

      // Handle Turn messages (v3 API - contains transcript)
      if (messageType === 'Turn') {
        const turnOrder = data.turn_order;
        const transcript = data.transcript || '';
        const endOfTurn = data.end_of_turn;
        const turnIsFormatted = data.turn_is_formatted;
        
        if (turnOrder === undefined) {
          console.log('⚠️ Turn message without turn_order:', data);
          return;
        }
        
        // Update turn storage
        this.turns[turnOrder] = transcript;
        
        // Emit LIVE word-by-word as partials
        if (!endOfTurn && transcript.trim()) {
          console.log(`📝 Partial turn ${turnOrder}:`, transcript);
          this.onTranscript?.({
            type: 'partial',
            text: transcript
          });
        }
        // When turn ends and is formatted, emit as final
        else if (endOfTurn && turnIsFormatted && turnOrder > this.lastEmittedTurn && transcript.trim()) {
          console.log(`✅ Final formatted turn ${turnOrder}:`, transcript);
          this.lastEmittedTurn = turnOrder;
          
          this.onTranscript?.({
            type: 'final',
            text: transcript
          });
        }
        
        return;
      }

      // Handle session terminated
      if (messageType === 'End' || messageType === 'SessionTerminated') {
        console.log('Session terminated:', data);
        this.onTranscript?.({ type: 'disconnected' });
        return;
      }

      // Log unknown message types
      console.log('Unknown AssemblyAI message:', messageType);
    } catch (error) {
      console.error('Error parsing AssemblyAI message:', error);
    }
  }

  /**
   * Start streaming audio to AssemblyAI
   * Uses continuous data callback for gapless streaming
   */
  private async startAudioStreaming() {
    console.log('Starting continuous audio streaming...');
    this.isRecording = true;

    // Request microphone permission explicitly on Android
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = require('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'StudyOS needs access to your microphone for transcription',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.error('❌ Microphone permission denied');
          throw new Error('Microphone permission denied');
        }
        console.log('✅ Microphone permission granted');
      } catch (error) {
        console.error('❌ Error requesting microphone permission:', error);
        throw error;
      }
    }

    // Initialize audio recorder with continuous streaming
    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION
      wavFile: 'assemblyai_stream.wav', // Not used for streaming, but required by lib
    };

    // IMPORTANT: Set up the data callback BEFORE calling init/start
    console.log('📡 Setting up audio data callback...');
    AudioRecord.on('data', (base64Chunk: string) => {
      // Debug: log when we receive data
      console.log(`📦 Received audio chunk - type: ${typeof base64Chunk}, length: ${base64Chunk ? base64Chunk.length : 0}, isEmpty: ${!base64Chunk || base64Chunk.length === 0}`);
      
      if (!base64Chunk || base64Chunk.length === 0) {
        console.log('⚠️ Empty audio chunk received - microphone might not be capturing');
        return;
      }
      
      if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('⚠️ Skipping chunk - not recording or WS not open');
        return;
      }

      try {
        // v3 API requires chunks between 50-1000ms (1600-32000 bytes at 16kHz 16-bit)
        // react-native-audio-record may emit smaller chunks, so we buffer them
        
        // Decode base64 to binary
        const decoded = base64Decode(base64Chunk);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          bytes[i] = decoded.charCodeAt(i);
        }
        
        console.log(`🔊 Decoded ${bytes.length} bytes from base64`);
        
        // Add to buffer
        this.audioBuffer.push(bytes);
        
        // Calculate total buffered size
        const totalSize = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
        
        // Send if we have at least 50ms of audio (1600 bytes)
        if (totalSize >= this.MIN_CHUNK_SIZE) {
          // Concatenate all buffered chunks
          const combined = new Uint8Array(totalSize);
          let offset = 0;
          for (const chunk of this.audioBuffer) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          // Send to AssemblyAI
          console.log(`🎤 Sending ${totalSize} bytes to AssemblyAI (${(totalSize / 32).toFixed(1)}ms at 16kHz)`);
          this.ws.send(combined.buffer);
          
          // Clear buffer
          this.audioBuffer = [];
        } else {
          console.log(`📊 Buffered ${totalSize}/${this.MIN_CHUNK_SIZE} bytes (waiting for more)`);
        }
      } catch (error) {
        console.error('Error processing audio chunk:', error);
      }
    });

    try {
      AudioRecord.init(options);
      console.log('✅ AudioRecord initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AudioRecord:', error);
      throw error;
    }

    // Start continuous recording
    try {
      AudioRecord.start();
      console.log('🎙️ Continuous audio recording started - waiting for data chunks...');
    } catch (error) {
      console.error('❌ Failed to start AudioRecord:', error);
      throw error;
    }
  }

  /**
   * Stop the transcription session
   * 1. Stop audio recording
   * 2. Close WebSocket
   * 3. Return session ID for persistence
   */
  async stop(): Promise<string | null> {
    console.log('Stopping AssemblyAI transcription...');
    
    this.isRecording = false;

    // Clear audio buffer and turn tracking
    this.audioBuffer = [];
    this.turns = {};
    this.lastEmittedTurn = -1;

    // Stop audio recording
    try {
      AudioRecord.stop();
    } catch (error) {
      console.error('Error stopping audio recorder:', error);
    }

    // Close WebSocket gracefully
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // Send Terminate message for v3 API
        this.ws.send(JSON.stringify({ type: 'Terminate' }));
        this.ws.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }

    const sessionId = this.sessionInfo?.session_id || null;
    this.ws = null;
    this.sessionInfo = null;

    return sessionId;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionInfo?.session_id || null;
  }
}
