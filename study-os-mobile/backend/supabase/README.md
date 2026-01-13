# Supabase Migrations

This directory contains SQL migrations and Row Level Security (RLS) policies for the Study OS backend.

## Structure

```
backend/supabase/
├── migrations/
│   └── 001_transcription_tables.sql    # Schema for transcription system
├── policies/
│   └── 001_transcription_rls.sql       # RLS policies for security
└── README.md                            # This file
```

---

## Running Migrations

### Using Supabase CLI (Recommended)

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link to your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Run migrations:**
   ```bash
   supabase db push
   ```

### Using Supabase Dashboard

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Copy contents of migration file
3. Run SQL in the editor
4. Repeat for policy file

### Using Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(url, serviceRoleKey);

// Run migration
const migrationSQL = readFileSync('./migrations/001_transcription_tables.sql', 'utf8');
await supabase.rpc('exec_sql', { sql: migrationSQL });

// Apply policies
const policiesSQL = readFileSync('./policies/001_transcription_rls.sql', 'utf8');
await supabase.rpc('exec_sql', { sql: policiesSQL });
```

---

## Migration 001: Transcription System

### Tables Created

#### 1. `transcription_sessions`
Represents a single recording/transcription job.

**Columns:**
- `id` - UUID primary key
- `user_id` - User who owns the session
- `source_type` - Source type (default: 'live_recording')
- `status` - Current status (recording, processing, complete, failed)
- `language` - Optional language code (e.g., 'en-US')
- `created_at`, `updated_at` - Timestamps

**Indexes:**
- `idx_transcription_sessions_user_id` - For user queries
- `idx_transcription_sessions_status` - For status filtering

---

#### 2. `transcription_chunks`
Individual audio chunks with overlap for seamless transcription.

**Columns:**
- `id` - UUID primary key
- `session_id` - Foreign key to transcription_sessions
- `chunk_index` - Sequential index (0, 1, 2, ...)
- `storage_path` - Supabase Storage path to audio file
- `duration_ms` - Chunk duration in milliseconds
- `overlap_ms` - Overlap with previous chunk (0 for first)
- `status` - Processing status (uploaded, transcribing, done, failed)
- `error` - Optional error message
- `created_at` - Timestamp

**Constraints:**
- Unique `(session_id, chunk_index)` - No duplicate indices per session
- Check `chunk_index >= 0`
- Check `duration_ms > 0`
- Check `overlap_ms >= 0`

**Indexes:**
- `idx_transcription_chunks_session_id` - For session queries
- `idx_transcription_chunks_status` - For status filtering

---

#### 3. `transcript_segments`
Transcribed text segments from audio chunks.

**Columns:**
- `id` - UUID primary key
- `session_id` - Foreign key to transcription_sessions
- `chunk_index` - Source chunk index
- `text` - Transcribed text content
- `start_ms`, `end_ms` - Optional timestamps relative to session start
- `confidence` - Optional confidence score (0.0 - 1.0)
- `created_at` - Timestamp

**Indexes:**
- `idx_transcript_segments_session_chunk` - Composite index for efficient querying
- `idx_transcript_segments_session_id` - For session-level queries

---

#### 4. `transcripts`
Merged full transcript text for fast retrieval.

**Columns:**
- `session_id` - Primary key (one transcript per session)
- `full_text` - Full merged transcript with overlaps trimmed
- `updated_at` - Last update timestamp

**Purpose:**
- Provides fast access to full transcript without reconstructing from segments
- Backend updates this as chunks are transcribed and merged

---

### Triggers

#### `update_updated_at_column()`
Automatically updates `updated_at` timestamp on row update.

**Applied to:**
- `transcription_sessions`
- `transcripts`

---

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

#### `transcription_sessions`
Users have full CRUD access to their own sessions:
- ✅ SELECT where `user_id = auth.uid()`
- ✅ INSERT where `user_id = auth.uid()`
- ✅ UPDATE where `user_id = auth.uid()`
- ✅ DELETE where `user_id = auth.uid()`

#### `transcription_chunks`
Users can access chunks only if they own the parent session:
- ✅ SELECT/INSERT/UPDATE/DELETE with session ownership check via EXISTS subquery

#### `transcript_segments`
Users can access segments only if they own the parent session:
- ✅ SELECT/INSERT/UPDATE/DELETE with session ownership check via EXISTS subquery

#### `transcripts`
Users can access transcripts only if they own the parent session:
- ✅ SELECT/INSERT/UPDATE/DELETE with session ownership check via EXISTS subquery

---

## Storage Policies

In addition to database RLS, configure Supabase Storage policies for audio files:

### Bucket: `transcriptions`

```sql
-- Users can upload to their own session directories
CREATE POLICY "Users can upload to own session directories"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'transcriptions' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM transcription_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can read from their own session directories
CREATE POLICY "Users can read own session files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'transcriptions' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM transcription_sessions WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own session files
CREATE POLICY "Users can delete own session files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'transcriptions' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM transcription_sessions WHERE user_id = auth.uid()
    )
  );
```

---

## Testing Migrations

### 1. Verify Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'transcript%';
```

Expected output:
```
transcription_sessions
transcription_chunks
transcript_segments
transcripts
```

### 2. Verify Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE 'transcript%';
```

### 3. Verify RLS Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'transcript%';
```

All should show `rowsecurity = true`.

### 4. Test RLS Policies

```sql
-- Set user context
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';

-- Create session
INSERT INTO transcription_sessions (user_id) 
VALUES ('user-uuid-here') 
RETURNING id;

-- Try to access another user's session (should return empty)
SELECT * FROM transcription_sessions WHERE user_id != 'user-uuid-here';
```

---

## Rollback

To rollback these migrations:

```sql
-- Drop policies first
DROP POLICY IF EXISTS "Users can view own transcription sessions" ON transcription_sessions;
-- ... (repeat for all policies)

-- Drop tables (cascade will drop foreign keys)
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS transcript_segments CASCADE;
DROP TABLE IF EXISTS transcription_chunks CASCADE;
DROP TABLE IF EXISTS transcription_sessions CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## Performance Considerations

### Query Optimization

1. **Session queries**: Indexed on `(user_id, created_at DESC)`
2. **Chunk queries**: Indexed on `(session_id, chunk_index)`
3. **Segment queries**: Composite index on `(session_id, chunk_index, created_at)`

### Scaling Recommendations

For high-volume workloads:
- Enable connection pooling (PgBouncer)
- Consider partitioning `transcript_segments` by `created_at`
- Add materialized views for dashboard queries
- Monitor query performance with `pg_stat_statements`

---

## Security Best Practices

1. **Service Role Key**: Only use on backend, never expose to client
2. **Anon Key**: Safe for client use with RLS enabled
3. **Rate Limiting**: Implement application-level limits:
   - Max sessions per user per day
   - Max chunks per session
   - Max audio file size
4. **Audit Logging**: Consider adding triggers for:
   - Session creation/deletion events
   - Failed transcription attempts
   - Unusual chunk patterns

---

## Next Steps

1. **Run migrations** using Supabase CLI or Dashboard
2. **Create Storage bucket** named `transcriptions`
3. **Apply Storage policies** (see above)
4. **Test RLS** with sample data
5. **Monitor performance** and add indexes as needed

---

## Related Documentation

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Contracts Documentation](../../contracts/README.md)
