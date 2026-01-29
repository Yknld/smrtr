# ⚠️ MIGRATION REQUIRED - Run This SQL Now

## What Happened

The smart polling system needs two new columns in the `lesson_assets` table:
- `conversation_id` - to track OpenHand conversation status
- `metadata` - to store GitHub path and other info

## How to Apply (2 minutes)

### Option 1: Supabase Dashboard (Easiest)

1. **Open SQL Editor**:
   https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql/new

2. **Copy this SQL**:
   ```sql
   -- Apply migration: Add conversation_id and metadata to lesson_assets

   -- Make storage_path nullable
   ALTER TABLE lesson_assets 
   ALTER COLUMN storage_path DROP NOT NULL;

   -- Add conversation_id column
   ALTER TABLE lesson_assets
   ADD COLUMN IF NOT EXISTS conversation_id text NULL;

   -- Add metadata column
   ALTER TABLE lesson_assets
   ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

   -- Add comments
   COMMENT ON COLUMN lesson_assets.conversation_id IS 'OpenHand conversation ID for tracking video generation';
   COMMENT ON COLUMN lesson_assets.metadata IS 'Additional metadata (e.g., github_path, generation params)';

   -- Verify columns exist
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'lesson_assets'
     AND column_name IN ('conversation_id', 'metadata', 'storage_path')
   ORDER BY column_name;
   ```

3. **Click "Run"**

4. **Verify Output** should show:
   ```
   conversation_id | text  | YES
   metadata        | jsonb | YES
   storage_path    | text  | YES
   ```

### Option 2: Supabase CLI

```bash
cd /Users/danielntumba/smrtr/study-os-mobile

# Copy SQL to clipboard (macOS)
cat apply_migration_018.sql | pbcopy

# Then paste and run in Supabase SQL Editor
```

## Test After Applying

Run the polling script again:

```bash
./poll_github_videos.sh
```

Should now show:
```
✨ No pending videos.
```

Instead of an error!

## Then Generate a Test Video

```bash
curl -X POST "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_generate_video" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c"}' | jq '.'
```

Should return:
```json
{
  "lesson_id": "34b9a0c7-62d7-4002-a642-00488b2c7f7c",
  "video_id": "...",
  "status": "generating",
  "conversation_id": "...",
  "github_path": "videos/...",
  "github_url": "https://raw.githubusercontent.com/..."
}
```

Then poll:
```bash
./poll_github_videos.sh
```

Should show:
```
⏳ 1 video(s) still generating. Check again in 30-60 seconds.
```

Perfect! 🎉
