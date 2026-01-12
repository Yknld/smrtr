# Storage Quick Reference

## 📦 Quick Setup

### 1. Apply Migration
```bash
cd study-os-mobile
supabase db execute -f supabase/migrations/009_storage_setup.sql
```

### 2. Verify Setup
```sql
-- Check buckets exist
SELECT id, name, public FROM storage.buckets 
WHERE id IN ('lesson_assets', 'tts_audio');

-- Check policies exist (should return 8)
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'objects' 
AND (policyname LIKE '%lesson%' OR policyname LIKE '%tts%');
```

---

## 🗂️ Bucket Overview

| Bucket | Purpose | Size Limit | File Types |
|--------|---------|------------|------------|
| `lesson_assets` | User lesson files | 50MB | PDF, audio, images, text |
| `tts_audio` | Generated TTS chunks | 10MB | MP3, MPEG |

---

## 🛣️ Path Conventions

### Lesson Assets
```
{user_id}/{lesson_id}/{filename}
```
**Example:**
```
550e8400-e29b-41d4-a716-446655440000/lesson_123/chapter1.pdf
```

### TTS Audio
```
{user_id}/{study_session_id}/{target_lang}/chunk_{seq}.mp3
```
**Example:**
```
550e8400-e29b-41d4-a716-446655440000/session_789/es/chunk_0.mp3
```

---

## 🔐 Access Control

✅ Users can **read, write, update, delete** only their own files  
❌ Users **cannot** access other users' files  
✅ Enforced via RLS policies on `storage.objects` table  

**How it works:**
- First path segment must match `auth.uid()`
- Example: User `abc123` can only access `abc123/*` paths

---

## 📱 Mobile Client Examples

### Upload File
```typescript
const userId = supabase.auth.user()?.id;
const { data, error } = await supabase.storage
  .from('lesson_assets')
  .upload(`${userId}/lesson_123/file.pdf`, fileBlob);
```

### Download File
```typescript
const { data, error } = await supabase.storage
  .from('lesson_assets')
  .download(`${userId}/lesson_123/file.pdf`);
```

### Get Signed URL (1 hour)
```typescript
const { data, error } = await supabase.storage
  .from('tts_audio')
  .createSignedUrl(`${userId}/session_789/es/chunk_0.mp3`, 3600);

const audioUrl = data.signedUrl;
```

### Delete File
```typescript
await supabase.storage
  .from('lesson_assets')
  .remove([`${userId}/lesson_123/file.pdf`]);
```

---

## ✅ Test Checklist

See: `backend/tests/sql/storage_checklist.md`

**Key Tests:**
1. ✅ User1 can upload/read own files
2. ❌ User2 cannot read User1's files
3. ❌ User2 cannot upload to User1's folder
4. ✅ User2 can upload to own folder
5. ❌ Invalid paths (no user_id prefix) fail
6. ✅ Signed URLs work for own files
7. ❌ Signed URLs fail for other users' files

---

## 🐛 Troubleshooting

### "Policy not satisfied"
- Ensure path starts with authenticated user's ID
- Check user is logged in: `supabase.auth.user()`

### "File size exceeds limit"
- lesson_assets: max 50MB
- tts_audio: max 10MB

### "Invalid MIME type"
- Check allowed file types for bucket
- Set correct `contentType` when uploading

---

## 📚 Full Documentation

For detailed usage, examples, and React Native integration:
- **Full Docs:** `backend/docs/storage.md`
- **Test Checklist:** `backend/tests/sql/storage_checklist.md`
- **Migration:** `supabase/migrations/009_storage_setup.sql`
