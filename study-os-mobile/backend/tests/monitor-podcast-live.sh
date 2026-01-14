#!/bin/bash

# Monitor podcast generation in real-time
# Usage: ./monitor-podcast-live.sh

LESSON_ID="34b9a0c7-62d7-4002-a642-00488b2c7f7c"

echo "🎙️  Monitoring podcast generation for lesson..."
echo ""

while true; do
  clear
  echo "🎙️  PODCAST GENERATION MONITOR"
  echo "=========================================="
  echo ""
  
  node -e "
  import { createClient } from '@supabase/supabase-js';

  const SUPABASE_URL = 'https://euxfugfzmpsemkjpcpuz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGZ1Z2Z6bXBzZW1ranBjcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMDYsImV4cCI6MjA4MzU4NTIwNn0.bsfC3T5WoUhGrS-6VuowULRHciY7BpzMCBQ3F4fZFRI';

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  await supabase.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'password123',
  });

  const { data: episode } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('lesson_id', '$LESSON_ID')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!episode) {
    console.log('⏸️  No episode found - waiting for generation to start...');
    process.exit(0);
  }

  console.log(\`📝 Status: \${episode.status.toUpperCase()}\`);
  console.log(\`   Title: \${episode.title || '(generating)'}\`);
  console.log(\`   Total Segments: \${episode.total_segments}\`);
  
  if (episode.error) {
    console.log(\`   ❌ Error: \${episode.error}\`);
  }
  
  console.log('');

  const { data: segments } = await supabase
    .from('podcast_segments')
    .select('seq, speaker, tts_status, created_at')
    .eq('episode_id', episode.id)
    .order('seq');

  if (!segments || segments.length === 0) {
    console.log('⏸️  No segments yet...');
    process.exit(0);
  }

  const counts = segments.reduce((acc, s) => {
    acc[s.tts_status] = (acc[s.tts_status] || 0) + 1;
    return acc;
  }, {});

  const progress = Math.round(((counts.ready || 0) / episode.total_segments) * 100);
  
  console.log('📊 Progress:');
  console.log(\`   \${progress}% complete\`);
  console.log(\`   ✅ Ready: \${counts.ready || 0}\`);
  console.log(\`   ⏳ Generating: \${counts.generating || 0}\`);
  console.log(\`   ⏸️  Queued: \${counts.queued || 0}\`);
  console.log(\`   ❌ Failed: \${counts.failed || 0}\`);
  console.log('');

  // Show recent activity
  const recent = segments.slice(-5);
  console.log('📋 Last 5 segments:');
  recent.forEach(seg => {
    const status = {
      ready: '✅',
      generating: '⏳',
      queued: '⏸️',
      failed: '❌'
    }[seg.tts_status];
    console.log(\`   \${status} Seg \${seg.seq} (Speaker \${seg.speaker.toUpperCase()})\`);
  });
  
  if (counts.failed > 0) {
    const failed = segments.filter(s => s.tts_status === 'failed');
    console.log('');
    console.log('❌ Failed segments:', failed.map(s => s.seq).join(', '));
  }

  if (episode.status === 'ready') {
    console.log('');
    console.log('🎉 PODCAST COMPLETE!');
    process.exit(0);
  }

  if (episode.status === 'failed') {
    console.log('');
    console.log('💥 PODCAST FAILED');
    process.exit(1);
  }
  " 2>/dev/null

  echo ""
  echo "Press Ctrl+C to stop monitoring"
  echo "Refreshing in 3 seconds..."
  
  sleep 3
done
