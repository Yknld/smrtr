#!/bin/bash
echo "📊 Monitoring podcast generation..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
  node -e "
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient('https://euxfugfzmpsemkjpcpuz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI');
  await supabase.auth.signInWithPassword({ email: 'user1@test.com', password: 'password123' });
  const { data: episode } = await supabase.from('podcast_episodes').select('*').eq('lesson_id', '34b9a0c7-62d7-4002-a642-00488b2c7f7c').single();
  const { data: segments } = await supabase.from('podcast_segments').select('tts_status').eq('episode_id', episode.id);
  const counts = segments.reduce((acc, s) => { acc[s.tts_status] = (acc[s.tts_status] || 0) + 1; return acc; }, {});
  const time = new Date().toLocaleTimeString();
  console.log(\`[\${time}] ✅ \${counts.ready||0} | ⏳ \${counts.generating||0} | ⏸️ \${counts.queued||0} | ❌ \${counts.failed||0}\`);
  " 2>/dev/null
  sleep 5
done
