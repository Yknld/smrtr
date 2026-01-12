# Client Integration Guide

How to use the transcription Edge Functions from your React Native app.

---

## Setup

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

---

## Complete Flow Example

### 1. Start Recording Session

```typescript
async function startTranscriptionSession(language?: string) {
  const { data, error } = await supabase.functions.invoke('transcribe_start', {
    body: { language: language || 'en-US' },
  });

  if (error) throw error;
  
  return data.session_id;
}
```

---

### 2. Upload & Transcribe Chunks

```typescript
async function uploadAndTranscribeChunk(
  sessionId: string,
  chunkIndex: number,
  audioBlob: Blob,
  durationMs: number,
  overlapMs: number = 500
) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  // 1. Upload to Storage
  const storagePath = `transcription/${userId}/${sessionId}/chunk_${chunkIndex}.m4a`;
  
  const { error: uploadError } = await supabase.storage
    .from('raw_audio_chunks')
    .upload(storagePath, audioBlob, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // 2. Trigger transcription
  const { data, error } = await supabase.functions.invoke('transcribe_chunk', {
    body: {
      session_id: sessionId,
      chunk_index: chunkIndex,
      storage_path: storagePath,
      duration_ms: durationMs,
      overlap_ms: overlapMs,
    },
  });

  if (error) throw error;

  return {
    chunkId: data.chunk_id,
    status: data.status,
    tailText: data.tail_text, // Use for live captions
  };
}
```

---

### 3. Poll for Progress

```typescript
async function pollTranscriptionStatus(sessionId: string) {
  const { data, error } = await supabase.functions.invoke('transcribe_poll', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: { session_id: sessionId },
  });

  if (error) throw error;

  return {
    status: data.status,
    progress: data.progress,
    fullText: data.full_text,
    tailText: data.tail_text,
    chunks: data.chunks,
    completedChunks: data.completed_chunks,
    totalChunks: data.total_chunks,
  };
}
```

---

## React Native Component Example

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const LiveTranscriptionScreen = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [chunkIndex, setChunkIndex] = useState(0);

  const audioRecorder = new AudioRecorderPlayer();

  // Start session
  const handleStart = async () => {
    const sid = await startTranscriptionSession('en-US');
    setSessionId(sid);
    setIsRecording(true);
    
    // Start recording with 5s chunks, 0.5s overlap
    startChunkedRecording(sid);
  };

  // Record in chunks
  const startChunkedRecording = async (sid: string) => {
    let currentChunk = 0;
    
    const recordChunk = async () => {
      if (!isRecording) return;

      // Record 5s chunk
      const result = await audioRecorder.startRecorder();
      
      setTimeout(async () => {
        const audioPath = await audioRecorder.stopRecorder();
        
        // Convert to Blob
        const response = await fetch(`file://${audioPath}`);
        const blob = await response.blob();
        
        // Upload & transcribe
        const result = await uploadAndTranscribeChunk(
          sid,
          currentChunk,
          blob,
          5000, // 5 seconds
          500   // 0.5s overlap
        );
        
        // Update live captions
        setLiveText(result.tailText);
        
        currentChunk++;
        
        // Record next chunk
        if (isRecording) {
          recordChunk();
        }
      }, 5000);
    };
    
    recordChunk();
  };

  // Stop recording
  const handleStop = () => {
    setIsRecording(false);
    audioRecorder.stopRecorder();
  };

  // Poll for full transcript
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      const status = await pollTranscriptionStatus(sessionId);
      setLiveText(status.tailText);
    }, 2000); // Poll every 2s

    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        Live Transcription
      </Text>
      
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={isRecording ? handleStop : handleStart}
      />

      <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0' }}>
        <Text>{liveText || 'Waiting for audio...'}</Text>
      </View>
    </View>
  );
};
```

---

## Best Practices

### ✅ Chunk Configuration

```typescript
const CHUNK_CONFIG = {
  duration: 5000,      // 5 seconds
  overlap: 500,        // 0.5 seconds
  format: 'audio/mp4', // m4a
  sampleRate: 16000,   // 16 kHz (good for speech)
};
```

### ✅ Error Handling

```typescript
try {
  await uploadAndTranscribeChunk(...);
} catch (error: any) {
  if (error.message.includes('Unauthorized')) {
    // Re-authenticate user
  } else if (error.message.includes('exceeds maximum')) {
    // Chunk too large, reduce duration
  } else {
    // Generic error
    console.error('Transcription error:', error);
  }
}
```

### ✅ Retry Logic

```typescript
async function uploadWithRetry(
  uploadFn: () => Promise<any>,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### ✅ Storage Cleanup

```typescript
async function cleanupSession(sessionId: string) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return;

  // Delete all chunks for this session
  const { data: files } = await supabase.storage
    .from('raw_audio_chunks')
    .list(`transcription/${userId}/${sessionId}`);

  if (files) {
    const filePaths = files.map(
      f => `transcription/${userId}/${sessionId}/${f.name}`
    );
    await supabase.storage.from('raw_audio_chunks').remove(filePaths);
  }
}
```

---

## Performance Tips

1. **Batch Polling:** Poll every 2-3s, not after each chunk
2. **Show Progress:** Use `progress` field for UI feedback
3. **Cache Chunks:** Don't re-upload failed chunks
4. **Limit Polling:** Stop polling when `status === 'complete'`
5. **Use tail_text:** Display for immediate feedback, use `full_text` for final

---

## Debugging

### Enable Edge Function Logs

```typescript
const { data, error } = await supabase.functions.invoke('transcribe_chunk', {
  body: { ... },
  headers: {
    'X-Debug': 'true', // Add debug header
  },
});
```

### Check Storage Upload

```typescript
const { data: fileCheck } = await supabase.storage
  .from('raw_audio_chunks')
  .list(`transcription/${userId}/${sessionId}`);

console.log('Uploaded chunks:', fileCheck);
```

### Verify Session in DB

```typescript
const { data: session } = await supabase
  .from('transcription_sessions')
  .select('*')
  .eq('id', sessionId)
  .single();

console.log('Session:', session);
```

---

## TypeScript Types

```typescript
interface TranscriptionSession {
  session_id: string;
  status: 'recording' | 'processing' | 'complete' | 'failed';
  language: string | null;
  created_at: string;
}

interface TranscriptionChunkResult {
  chunk_id: string;
  chunk_index: number;
  status: 'uploaded' | 'transcribing' | 'done' | 'failed';
  tail_text?: string;
}

interface TranscriptionPollResult {
  session_id: string;
  status: string;
  progress: number;
  chunks: Array<{
    chunk_index: number;
    status: string;
    duration_ms: number;
    error?: string;
  }>;
  total_chunks: number;
  completed_chunks: number;
  failed_chunks: number;
  full_text: string;
  tail_text: string;
  updated_at: string;
}
```

---

## Next Steps

1. ✅ Install `@supabase/supabase-js` and `react-native-audio-recorder-player`
2. ✅ Implement recording with 5s chunks
3. ✅ Add UI for live captions (`tail_text`)
4. ✅ Add progress indicator
5. ✅ Test with real device (not simulator - needs microphone)

---

## Support

- Edge Functions Code: `backend/functions/`
- API Spec: `backend/docs/edge-functions-transcription.md`
- MVP Plan: `docs/transcription-mvp-plan.md`
