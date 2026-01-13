# Storage Documentation

## Overview

This document describes the Supabase Storage setup for the StudyOS MVP, including bucket configurations, path conventions, and usage examples for mobile clients.

## Storage Buckets

We have two private storage buckets:

### 1. `lesson_assets`

**Purpose:** Store lesson-related files uploaded by users

**Configuration:**
- Public: `false` (requires authentication)
- File size limit: 50MB per file
- Allowed MIME types:
  - PDFs: `application/pdf`
  - Audio: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/m4a`, `audio/x-m4a`
  - Images: `image/jpeg`, `image/png`, `image/webp`
  - Text: `text/plain`, `application/json`

**Path Convention:**

```
lesson-assets/{user_id}/{lesson_id}/{filename}
```

**Examples:**
```
lesson-assets/550e8400-e29b-41d4-a716-446655440000/lesson_123/chapter1.pdf
lesson-assets/550e8400-e29b-41d4-a716-446655440000/lesson_456/recording.m4a
lesson-assets/550e8400-e29b-41d4-a716-446655440000/lesson_456/diagram.png
```

### 2. `tts_audio`

**Purpose:** Store generated TTS (Text-to-Speech) audio for both live study sessions and AI-generated podcasts

**Configuration:**
- Public: `false` (requires authentication)
- File size limit: 10MB per file
- Allowed MIME types:
  - `audio/mpeg`
  - `audio/mp3`

**Path Conventions:**

#### Live Session TTS Audio
```
tts/{user_id}/{study_session_id}/{target_lang}/chunk_{seq}.mp3
```

**Examples:**
```
tts/550e8400-e29b-41d4-a716-446655440000/session_789/es/chunk_0.mp3
tts/550e8400-e29b-41d4-a716-446655440000/session_789/es/chunk_1.mp3
tts/550e8400-e29b-41d4-a716-446655440000/session_789/fr/chunk_0.mp3
```

#### Podcast Episode Audio
```
podcasts/{user_id}/{episode_id}/seg_{seq}_{speaker}.mp3
```

**Examples:**
```
podcasts/550e8400-e29b-41d4-a716-446655440000/abc-123-def/seg_1_a.mp3
podcasts/550e8400-e29b-41d4-a716-446655440000/abc-123-def/seg_2_b.mp3
podcasts/550e8400-e29b-41d4-a716-446655440000/abc-123-def/seg_3_a.mp3
```

> **Note:** For detailed podcast audio usage, see [Podcast Storage Documentation](./podcasts-storage.md)

## Access Control (RLS Policies)

Both buckets enforce Row Level Security (RLS) policies that ensure:

✅ Users can **SELECT** (read) only their own files  
✅ Users can **INSERT** (upload) only to their own folders  
✅ Users can **UPDATE** (replace) only their own files  
✅ Users can **DELETE** only their own files  

The policies check that the first path segment (after the prefix) matches the authenticated user's ID:
- For `lesson_assets`: The path must start with `{user_id}/...`
- For `tts_audio`: The path must start with `{user_id}/...`

### Policy Examples

**Allowed:**
```
User: 550e8400-e29b-41d4-a716-446655440000
Path: 550e8400-e29b-41d4-a716-446655440000/lesson_123/file.pdf
Result: ✅ Allowed (user_id matches)
```

**Denied:**
```
User: 550e8400-e29b-41d4-a716-446655440000
Path: 999e8400-e29b-41d4-a716-446655440000/lesson_123/file.pdf
Result: ❌ Denied (user_id does not match)
```

## Mobile Client Usage

### Prerequisites

Ensure the Supabase client is initialized with authentication:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// User must be authenticated
await supabase.auth.signInWithPassword({ email, password });
```

### Uploading Lesson Assets

```typescript
import { supabase } from './supabaseClient';

async function uploadLessonAsset(
  userId: string,
  lessonId: string,
  file: File
): Promise<string> {
  const fileName = file.name;
  const filePath = `${userId}/${lessonId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('lesson_assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Set to true to replace existing file
    });
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  return data.path;
}

// Usage
const userId = supabase.auth.user()?.id;
const lessonId = 'lesson_123';
const file = /* File object from file picker */;

const uploadedPath = await uploadLessonAsset(userId, lessonId, file);
console.log('Uploaded to:', uploadedPath);
```

### Downloading Lesson Assets

```typescript
async function downloadLessonAsset(
  userId: string,
  lessonId: string,
  fileName: string
): Promise<Blob> {
  const filePath = `${userId}/${lessonId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('lesson_assets')
    .download(filePath);
  
  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
  
  return data;
}

// Usage
const blob = await downloadLessonAsset(userId, 'lesson_123', 'chapter1.pdf');
```

### Getting Public URL (Signed)

Since buckets are private, you need to generate signed URLs for temporary access:

```typescript
async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);
  
  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

// Usage for lesson asset
const signedUrl = await getSignedUrl(
  'lesson_assets',
  `${userId}/lesson_123/chapter1.pdf`,
  7200 // 2 hours
);

// Usage for TTS audio
const ttsUrl = await getSignedUrl(
  'tts_audio',
  `${userId}/session_789/es/chunk_0.mp3`,
  3600
);
```

### Uploading TTS Audio Chunks

```typescript
async function uploadTTSChunk(
  userId: string,
  sessionId: string,
  targetLang: string,
  chunkSeq: number,
  audioBlob: Blob
): Promise<string> {
  const filePath = `${userId}/${sessionId}/${targetLang}/chunk_${chunkSeq}.mp3`;
  
  const { data, error } = await supabase.storage
    .from('tts_audio')
    .upload(filePath, audioBlob, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
      upsert: true, // Allow overwriting
    });
  
  if (error) {
    throw new Error(`TTS upload failed: ${error.message}`);
  }
  
  return data.path;
}

// Usage
const audioBlob = /* Generated audio blob from TTS service */;
const uploadedPath = await uploadTTSChunk(
  userId,
  'session_789',
  'es',
  0,
  audioBlob
);
```

### Listing Files in a Folder

```typescript
async function listLessonAssets(
  userId: string,
  lessonId: string
): Promise<string[]> {
  const folderPath = `${userId}/${lessonId}`;
  
  const { data, error } = await supabase.storage
    .from('lesson_assets')
    .list(folderPath);
  
  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }
  
  return data.map(file => file.name);
}
```

### Deleting Files

```typescript
async function deleteLessonAsset(
  userId: string,
  lessonId: string,
  fileName: string
): Promise<void> {
  const filePath = `${userId}/${lessonId}/${fileName}`;
  
  const { error } = await supabase.storage
    .from('lesson_assets')
    .remove([filePath]);
  
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
```

## React Native Considerations

### File Upload from React Native

```typescript
import * as DocumentPicker from 'expo-document-picker';
import { decode } from 'base64-arraybuffer';

async function pickAndUploadDocument() {
  // Pick a document
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  
  if (result.type === 'cancel') {
    return;
  }
  
  // Read file as base64
  const response = await fetch(result.uri);
  const blob = await response.blob();
  
  // Upload to Supabase
  const userId = supabase.auth.user()?.id;
  const lessonId = 'lesson_123';
  const filePath = `${userId}/${lessonId}/${result.name}`;
  
  const { data, error } = await supabase.storage
    .from('lesson_assets')
    .upload(filePath, blob, {
      contentType: result.mimeType,
    });
  
  if (error) {
    console.error('Upload error:', error);
    return;
  }
  
  console.log('Uploaded successfully:', data.path);
}
```

### Audio Playback from Storage

```typescript
import { Audio } from 'expo-av';

async function playTTSAudio(
  userId: string,
  sessionId: string,
  targetLang: string,
  chunkSeq: number
) {
  const filePath = `${userId}/${sessionId}/${targetLang}/chunk_${chunkSeq}.mp3`;
  
  // Get signed URL
  const { data, error } = await supabase.storage
    .from('tts_audio')
    .createSignedUrl(filePath, 3600);
  
  if (error) {
    throw new Error(`Failed to get audio URL: ${error.message}`);
  }
  
  // Play audio
  const { sound } = await Audio.Sound.createAsync(
    { uri: data.signedUrl },
    { shouldPlay: true }
  );
  
  return sound;
}
```

## Best Practices

### Path Construction
- Always use the authenticated user's ID from `supabase.auth.user()?.id`
- Never hardcode user IDs in paths
- Use consistent naming conventions for folders and files

### Error Handling
- Always check for `error` in Supabase responses
- Provide meaningful error messages to users
- Log errors for debugging

### File Size Management
- Check file size before upload to avoid hitting limits
- Compress images and audio when possible
- Consider chunking large files if needed

### Security
- Never expose storage keys in client code
- Always use signed URLs for private content
- Set appropriate expiration times for signed URLs
- Validate file types before upload on the client side

### Performance
- Cache signed URLs to avoid repeated API calls
- Use `upsert: true` when replacing files to avoid orphaned data
- Batch delete operations when removing multiple files
- Consider lazy loading for large file lists

## Troubleshooting

### Common Errors

**Error: "Policy not satisfied"**
- Ensure the path starts with the authenticated user's ID
- Verify the user is logged in before attempting storage operations

**Error: "File size exceeds limit"**
- Check file size before upload
- Compress files if they exceed bucket limits

**Error: "Invalid MIME type"**
- Verify the file type is allowed for the bucket
- Set correct `contentType` when uploading

**Error: "Resource not found"**
- Double-check the file path
- Ensure the file was actually uploaded
- Verify you have permission to access the file

### Testing Storage Locally

Use the Supabase CLI to test storage locally:

```bash
# Start local Supabase
supabase start

# Check storage configuration
supabase storage list

# View policies
supabase db dump --table storage.objects
```

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Security](https://supabase.com/docs/guides/storage/security/access-control)
- [React Native File Upload](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
