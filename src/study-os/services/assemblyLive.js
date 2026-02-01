/**
 * AssemblyAI live transcription for web.
 * 1. Call transcribe_start (Edge Function) to get session_id + assemblyai_ws_url + token.
 * 2. Connect to AssemblyAI WebSocket, stream PCM 16kHz 16-bit mono.
 * 3. Emit partial/final transcript events; return session_id on stop.
 * Mirror: study-os-mobile/apps/mobile/src/services/assemblyLive.ts
 */

const TARGET_SAMPLE_RATE = 16000
const MIN_CHUNK_BYTES = 1600 // 50ms at 16kHz 16-bit

/**
 * @typedef {'connected'|'partial'|'final'|'error'|'disconnected'} TranscriptEventType
 * @typedef {{ type: TranscriptEventType, text?: string, error?: string }} TranscriptEvent
 */

export class AssemblyLiveService {
  constructor(onTranscript) {
    this.onTranscript = onTranscript
    this.ws = null
    this.sessionInfo = null
    this.isRecording = false
    this.audioBuffer = []
    this.turns = {}
    this.lastEmittedTurn = -1
    this.audioContext = null
    this.mediaStream = null
    this.scriptNode = null
    this.sourceNode = null
  }

  /**
   * Start: call transcribe_start (caller passes backend response), then connect WS and start mic.
   * @param {{ session_id: string, assemblyai_ws_url: string, assemblyai_token?: string }} sessionInfo - from liveTranscription.repository startTranscriptionSession()
   */
  async start(sessionInfo) {
    if (!sessionInfo?.assemblyai_ws_url) {
      throw new Error('AssemblyAI WebSocket URL not provided')
    }
    this.sessionInfo = sessionInfo
    await this.connectWebSocket()
    await this.startAudioStreaming()
  }

  connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.sessionInfo.assemblyai_ws_url)
      this.ws.onopen = () => {
        this.onTranscript?.({ type: 'connected' })
        resolve()
      }
      this.ws.onmessage = (event) => this.handleMessage(event)
      this.ws.onerror = (err) => {
        this.onTranscript?.({ type: 'error', error: 'Connection error' })
        reject(err)
      }
      this.ws.onclose = () => {
        this.onTranscript?.({ type: 'disconnected' })
        this.isRecording = false
      }
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) reject(new Error('WebSocket connection timeout'))
      }, 10000)
    })
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data)
      const messageType = data.type
      if (messageType === 'Begin') return
      if (data.error) {
        this.onTranscript?.({ type: 'error', error: data.error })
        return
      }
      if (messageType === 'Turn') {
        const turnOrder = data.turn_order
        const transcript = data.transcript || ''
        const endOfTurn = data.end_of_turn
        const turnIsFormatted = data.turn_is_formatted
        if (turnOrder === undefined) return
        this.turns[turnOrder] = transcript
        if (!endOfTurn && transcript.trim()) {
          this.onTranscript?.({ type: 'partial', text: transcript })
        } else if (endOfTurn && turnIsFormatted && turnOrder > this.lastEmittedTurn && transcript.trim()) {
          this.lastEmittedTurn = turnOrder
          this.onTranscript?.({ type: 'final', text: transcript })
        }
        return
      }
      if (messageType === 'End' || messageType === 'SessionTerminated') {
        this.onTranscript?.({ type: 'disconnected' })
      }
    } catch (e) {
      console.error('AssemblyAI message parse error', e)
    }
  }

  async startAudioStreaming() {
    this.isRecording = true
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mediaStream = stream
    const sampleRate = 48000
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate })
    this.audioContext = ctx
    if (ctx.state === 'suspended') await ctx.resume()
    const source = ctx.createMediaStreamSource(stream)
    this.sourceNode = source
    const bufferSize = 4096
    const inputChannels = 1
    const outputChannels = 1
    const processor = ctx.createScriptProcessor(bufferSize, inputChannels, outputChannels)
    this.scriptNode = processor
    const downsampleRatio = sampleRate / TARGET_SAMPLE_RATE
    processor.onaudioprocess = (e) => {
      if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return
      const input = e.inputBuffer.getChannelData(0)
      const outLength = Math.floor(input.length / downsampleRatio)
      const out = new Int16Array(outLength)
      for (let i = 0; i < outLength; i++) {
        const srcIdx = i * downsampleRatio
        const idx = Math.floor(srcIdx)
        const frac = srcIdx - idx
        const s = idx + 1 < input.length
          ? input[idx] * (1 - frac) + input[idx + 1] * frac
          : input[idx]
        const v = Math.max(-1, Math.min(1, s))
        out[i] = v < 0 ? v * 32768 : v * 32767
      }
      this.audioBuffer.push(out)
      let total = 0
      for (const b of this.audioBuffer) total += b.byteLength
      if (total >= MIN_CHUNK_BYTES) {
        const combined = new Uint8Array(total)
        let offset = 0
        for (const b of this.audioBuffer) {
          combined.set(new Uint8Array(b.buffer), offset)
          offset += b.byteLength
        }
        this.audioBuffer = []
        this.ws.send(combined.buffer)
      }
    }
    source.connect(processor)
    processor.connect(ctx.destination)
  }

  /**
   * Stop recording, close WebSocket, return session_id for persistence.
   * @returns {Promise<string|null>} transcription_sessions.id
   */
  async stop() {
    this.isRecording = false
    this.audioBuffer = []
    this.turns = {}
    this.lastEmittedTurn = -1
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }
    if (this.scriptNode && this.sourceNode && this.audioContext) {
      try {
        this.sourceNode.disconnect()
        this.scriptNode.disconnect()
      } catch (_) {}
      this.scriptNode = null
      this.sourceNode = null
      this.audioContext = null
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'Terminate' }))
        this.ws.close()
      } catch (_) {}
    }
    const sessionId = this.sessionInfo?.session_id ?? null
    this.ws = null
    this.sessionInfo = null
    return sessionId
  }

  getSessionId() {
    return this.sessionInfo?.session_id ?? null
  }
}
