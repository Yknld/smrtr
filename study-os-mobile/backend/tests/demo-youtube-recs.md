# YouTube Recommendations Demo

## Status Check

✅ **Functions Deployed**:
- `lesson_youtube_recs`
- `lesson_create_from_youtube`
- `lesson_youtube_resource_add`

✅ **API Keys Set**:
- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`

⚠️ **Database Migration Pending**:
- Tables need to be created via Supabase Dashboard
- Migration SQL: `supabase/migrations/010_create_youtube_videos.sql`

## Quick Test (After Migration Applied)

### 1. Get Token
```bash
cd /Users/danielntumba/smrtr/study-os-mobile/backend/tests
export JWT_TOKEN="$(node get-token.js | grep 'eyJ' | head -1)"
```

### 2. Create Test Data
```bash
# Create a course
export COURSE_ID=$(curl -s -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/rest/v1/courses" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "Machine Learning Basics",
    "term": "Fall 2026",
    "color": "#4CAF50"
  }' | jq -r '.[0].id')

# Create a lesson
export LESSON_ID=$(curl -s -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/rest/v1/lessons" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "course_id": "'"${COURSE_ID}"'",
    "title": "Neural Networks and Deep Learning",
    "source_type": "import",
    "status": "ready"
  }' | jq -r '.[0].id')

echo "Course ID: ${COURSE_ID}"
echo "Lesson ID: ${LESSON_ID}"
```

### 3. Get YouTube Recommendations!
```bash
curl -X POST \
  "https://euxfugfzmpsemkjpcpuz.supabase.co/functions/v1/lesson_youtube_recs" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "'"${LESSON_ID}"'",
    "count": 3
  }' | jq '.'
```

## Expected Output

```json
{
  "cached": false,
  "results": [
    {
      "video_id": "aircAruvnKk",
      "title": "Neural Networks Explained in 10 Minutes",
      "url": "https://www.youtube.com/watch?v=aircAruvnKk",
      "thumbnail_url": "https://i.ytimg.com/vi/aircAruvnKk/mqdefault.jpg",
      "channel": "3Blue1Brown",
      "duration_seconds": 612,
      "view_count": 8500000,
      "reason": "ideal 10min length, covers neural networks, educational channel"
    },
    {
      "video_id": "IHZwWFHWa-w",
      "title": "Deep Learning Crash Course",
      "url": "https://www.youtube.com/watch?v=IHZwWFHWa-w",
      "thumbnail_url": "https://i.ytimg.com/vi/IHZwWFHWa-w/mqdefault.jpg",
      "channel": "freeCodeCamp.org",
      "duration_seconds": 900,
      "view_count": 2400000,
      "reason": "crash course format, covers deep learning"
    },
    {
      "video_id": "i8D90DkCLhI",
      "title": "Neural Networks Tutorial for Beginners",
      "url": "https://www.youtube.com/watch?v=i8D90DkCLhI",
      "thumbnail_url": "https://i.ytimg.com/vi/i8D90DkCLhI/mqdefault.jpg",
      "channel": "TechWithTim",
      "duration_seconds": 720,
      "view_count": 1200000,
      "reason": "tutorial format, beginner-friendly"
    }
  ]
}
```

## Example Topics to Try

Once the migration is applied, test with these topics:

### Computer Science
- "Binary Search Trees"
- "Dynamic Programming"
- "React Hooks Tutorial"
- "Python Data Structures"

### Science
- "Photosynthesis in Plants"
- "Cell Division Mitosis"
- "Quantum Mechanics Basics"
- "DNA Replication"

### History
- "French Revolution"
- "World War II History"
- "Ancient Rome"
- "Renaissance Art"

### Languages
- "Spanish Grammar Subjunctive"
- "French Pronunciation Guide"
- "Japanese Kanji Basics"

### Math
- "Calculus Integration Techniques"
- "Linear Algebra Basics"
- "Statistics Hypothesis Testing"
- "Trigonometry Identities"

## What the Function Does

1. **Gathers Context** from lesson summary/transcript/title
2. **Gemini AI Generates** 3-6 optimized search queries
3. **Searches YouTube** with smart parameters
4. **Ranks Videos** based on:
   - Duration (prefers 6-18 min)
   - Keywords (crash course, review, exam)
   - Educational channels
   - View count
5. **Returns Top 3** with reasons

## Next Steps

1. **Apply Migration**:
   - Go to: https://supabase.com/dashboard/project/euxfugfzmpsemkjpcpuz/sql
   - Copy migration SQL from clipboard (already copied!)
   - Click "Run"

2. **Test It**:
   - Run the commands above
   - Try different topics
   - Check the cached responses (<1s on second call!)

3. **Integrate into App**:
   - Add "Find Videos" button to lesson screens
   - Display recommendations in a nice list
   - Open videos in YouTube app/browser

## Troubleshooting

### If RLS errors persist:
The migration includes all necessary RLS policies. Make sure to run the ENTIRE migration file, not just parts of it.

### If no results found:
- Check YouTube API quota (10,000 units/day free)
- Try different region codes (US, CA, UK)
- Add more context to lessons (summaries help!)

### If function times out:
- First call takes 5-10s (generating fresh results)
- Subsequent calls <1s (cached for 24h)
- This is normal behavior!
