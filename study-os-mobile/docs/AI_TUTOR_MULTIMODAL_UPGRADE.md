# AI Tutor Multimodal Upgrade Plan

## Overview

Upgrade the AI Tutor to support:
1. **Latest Gemini Model** - Gemini 2.0 Flash (Thinking/Experimental)
2. **Image Support** - Upload and analyze images (diagrams, photos, screenshots)
3. **Audio Support** - Voice messages via AssemblyAI transcription

---

## 1. Gemini Model Options (January 2026)

### Current Model
- **gemini-2.0-flash** ✅ (already in use)
- Fast, multimodal, cost-effective
- Best for production use

### Available Upgrades

#### Option A: gemini-2.0-flash-thinking-exp
- Experimental model with enhanced reasoning
- Slower but more thoughtful responses
- Good for complex educational questions
- **Trade-off**: Higher latency, may hit rate limits

#### Option B: gemini-2.0-flash-exp  
- Experimental features + flash speed
- Balance between speed and capabilities
- Multimodal support (text, images, audio)

#### Recommendation
**Keep gemini-2.0-flash** for now - it's stable, fast, and already multimodal. Add image/audio support without changing the model.

---

## 2. Image Support Implementation

### Architecture

```
User uploads image → Mobile app → Supabase Storage → Edge function → Gemini API
                                        ↓
                                   Storage URL
                                        ↓
                                   Gemini processes
                                        ↓
                                   AI response with image context
```

### Implementation Steps

#### A. Database Changes
Add image support to messages table:

```sql
-- Add to messages table
ALTER TABLE messages ADD COLUMN attachments jsonb DEFAULT '[]';

COMMENT ON COLUMN messages.attachments IS 'Array of attachments: [{ type: "image" | "audio", url: string, mime_type: string }]';
```

#### B. Mobile App Changes

**File**: `apps/mobile/src/screens/AITutor/AITutorScreen.tsx`

1. Add image picker
2. Upload to Supabase Storage
3. Send image URL with message

```typescript
import * as ImagePicker from 'expo-image-picker';

// Add state
const [selectedImage, setSelectedImage] = useState<string | null>(null);

// Image picker
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    setSelectedImage(result.assets[0].uri);
  }
};

// Upload to Supabase Storage
const uploadImage = async (uri: string): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get file blob
  const response = await fetch(uri);
  const blob = await response.blob();
  
  // Generate unique filename
  const fileName = `${user.id}/${Date.now()}.jpg`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('tutor-attachments')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('tutor-attachments')
    .getPublicUrl(fileName);

  return publicUrl;
};

// Modified handleSend
const handleSend = async () => {
  // ... existing code ...
  
  // Upload image if present
  let attachments = [];
  if (selectedImage) {
    const imageUrl = await uploadImage(selectedImage);
    attachments.push({
      type: 'image',
      url: imageUrl,
      mime_type: 'image/jpeg',
    });
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tutor_chat`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
        lessonId: lessonId,
        message: messageText,
        attachments, // Send attachments
      }),
    }
  );
  
  setSelectedImage(null); // Clear after sending
};
```

#### C. Edge Function Changes

**File**: `supabase/functions/tutor_chat/index.ts`

```typescript
interface TutorChatRequest {
  conversationId?: string | null;
  lessonId?: string | null;
  courseId?: string | null;
  message: string;
  attachments?: Array<{
    type: 'image' | 'audio';
    url: string;
    mime_type: string;
  }>;
}

// When calling Gemini
const parts: any[] = [{ text: fullPrompt }];

// Add image attachments
if (attachments && attachments.length > 0) {
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      // Download image from Supabase Storage
      const imageResponse = await fetch(attachment.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = btoa(
        String.fromCharCode(...new Uint8Array(imageBuffer))
      );

      parts.push({
        inlineData: {
          mimeType: attachment.mime_type,
          data: imageBase64,
        },
      });
    }
  }
}

// Call Gemini with multimodal content
const result = await model.generateContent(parts);
```

---

## 3. Audio Support Implementation

### Two Approaches

#### Option A: Transcribe First (Recommended)
User records audio → AssemblyAI transcription → Send text to Gemini

**Pros:**
- Uses existing AssemblyAI integration
- Faster responses
- Text is searchable/indexable
- Lower API costs

**Cons:**
- Loses audio nuance (tone, emotion)

#### Option B: Direct Audio to Gemini
User records audio → Upload → Send to Gemini

**Pros:**
- Gemini can understand tone/emotion
- More natural interaction

**Cons:**
- Slower
- Higher costs
- More complex implementation

### Recommended: Option A (Transcribe First)

**File**: `apps/mobile/src/screens/AITutor/AITutorScreen.tsx`

```typescript
import { Audio } from 'expo-av';

const [isRecordingAudio, setIsRecordingAudio] = useState(false);
const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);

// Start audio recording
const startAudioRecording = async () => {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    
    setAudioRecording(recording);
    setIsRecordingAudio(true);
  } catch (err) {
    console.error('Failed to start recording', err);
  }
};

// Stop and transcribe
const stopAndTranscribeAudio = async () => {
  if (!audioRecording) return;

  setIsRecordingAudio(false);
  await audioRecording.stopAndUnloadAsync();
  const uri = audioRecording.getURI();
  
  if (!uri) return;

  // Upload audio to Supabase Storage
  const audioUrl = await uploadAudio(uri);
  
  // Call AssemblyAI for transcription
  const transcript = await transcribeAudio(audioUrl);
  
  // Set as message text
  setInputText(transcript);
  
  // Auto-send if desired
  // handleSend();
};

const transcribeAudio = async (audioUrl: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/transcribe_audio`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    }
  );

  const data = await response.json();
  return data.transcript;
};
```

### New Edge Function: transcribe_audio

**File**: `supabase/functions/transcribe_audio/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const { audio_url } = await req.json();

  // Validate auth
  // ... (similar to tutor_chat)

  // Call AssemblyAI
  const assemblyaiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
  
  // Submit for transcription
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': assemblyaiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audio_url,
    }),
  });

  const { id } = await uploadResponse.json();

  // Poll for completion
  let transcript = '';
  while (true) {
    const statusResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      {
        headers: { 'Authorization': assemblyaiKey },
      }
    );
    
    const data = await statusResponse.json();
    
    if (data.status === 'completed') {
      transcript = data.text;
      break;
    } else if (data.status === 'error') {
      throw new Error('Transcription failed');
    }
    
    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return new Response(
    JSON.stringify({ transcript }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## 4. UI/UX Updates

### Mobile App UI Additions

```tsx
// AI Tutor Input Area
<View style={styles.inputContainer}>
  {/* Attachment buttons */}
  <View style={styles.attachmentButtons}>
    <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
      <Ionicons name="image-outline" size={24} color={colors.primary} />
    </TouchableOpacity>
    
    <TouchableOpacity 
      onPress={isRecordingAudio ? stopAndTranscribeAudio : startAudioRecording}
      style={[styles.attachButton, isRecordingAudio && styles.recording]}
    >
      <Ionicons 
        name={isRecordingAudio ? "stop" : "mic-outline"} 
        size={24} 
        color={isRecordingAudio ? colors.error : colors.primary} 
      />
    </TouchableOpacity>
  </View>

  {/* Image preview */}
  {selectedImage && (
    <View style={styles.imagePreview}>
      <Image source={{ uri: selectedImage }} style={styles.previewImage} />
      <TouchableOpacity 
        onPress={() => setSelectedImage(null)}
        style={styles.removeButton}
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  )}

  {/* Text input */}
  <TextInput
    style={styles.input}
    value={inputText}
    onChangeText={setInputText}
    placeholder="Ask a question..."
    multiline
  />

  {/* Send button */}
  <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
    <Ionicons name="send" size={20} color={colors.primary} />
  </TouchableOpacity>
</View>
```

---

## 5. Supabase Storage Setup

### Create Storage Bucket

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-attachments', 'tutor-attachments', true);

-- Set up RLS policies
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tutor-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tutor-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tutor-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 6. Testing Plan

### Image Support
1. Upload diagram image
2. Ask "Explain this diagram"
3. Verify AI describes image correctly
4. Check image appears in chat history

### Audio Support
1. Record voice question: "What is photosynthesis?"
2. Verify transcription appears in input
3. Send message
4. Verify AI responds appropriately

### Language Support
1. Set language to Spanish
2. Upload image of graph
3. Ask in Spanish: "¿Qué muestra este gráfico?"
4. Verify AI responds in Spanish

---

## 7. Migration Strategy

### Phase 1: Backend (Week 1)
1. Add attachments column to messages table
2. Create tutor-attachments storage bucket
3. Update tutor_chat edge function for images
4. Create transcribe_audio edge function
5. Deploy and test

### Phase 2: Mobile UI (Week 2)
1. Add image picker button
2. Add audio recorder button
3. Implement upload logic
4. Add attachment previews
5. Test on iOS and Android

### Phase 3: Polish (Week 3)
1. Add loading states
2. Error handling
3. Image compression
4. Audio quality optimization
5. User feedback/analytics

---

## 8. Cost Considerations

### Gemini API
- **Current**: Text-only, ~$0.15/1M input tokens
- **With images**: +$0.25/1K images
- **Estimate**: ~$5-10/month for moderate use

### AssemblyAI
- **Already paying**: For live transcription
- **Audio messages**: Same API, no additional cost
- **Estimate**: Included in current budget

### Supabase Storage
- **Free tier**: 1GB storage, 2GB bandwidth
- **Images**: ~500KB each, ~2000 images = 1GB
- **Estimate**: Free for most users

---

## 9. Security Considerations

1. **Image validation**: Check file size, type, dimensions
2. **Audio validation**: Max 5 minutes, valid format
3. **Storage limits**: Max 10MB per file
4. **Rate limiting**: Max 10 attachments per minute
5. **Content moderation**: Consider scanning images for inappropriate content

---

## 10. Future Enhancements

1. **Real-time audio chat**: Live voice conversation with AI
2. **PDF support**: Upload and ask about PDF documents
3. **Video support**: Upload lecture videos for AI analysis
4. **Code execution**: Run code snippets from chat
5. **Collaborative notes**: Share AI conversations with classmates

---

## Next Steps

1. Review this plan
2. Approve storage bucket creation
3. Update database schema
4. Implement backend changes
5. Update mobile app
6. Test thoroughly
7. Deploy to production

Would you like me to start implementing these changes?
