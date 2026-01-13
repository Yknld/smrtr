-- ============================================================================
-- Verify Notes Migration Status
-- ============================================================================
-- 
-- Run this to check what's already applied
-- 
-- ============================================================================

-- Check if columns exist
SELECT 
  'Column Check' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name = 'notes_raw_text' THEN '✓ exists'
    WHEN column_name = 'notes_final_text' THEN '✓ exists'
    WHEN column_name = 'last_committed_seq' THEN '✓ exists'
    ELSE 'found'
  END as status
FROM information_schema.columns
WHERE table_name = 'lesson_outputs'
  AND column_name IN ('notes_raw_text', 'notes_final_text', 'last_committed_seq')
ORDER BY column_name;

-- Check type constraint
SELECT 
  'Constraint Check' as check_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition,
  CASE 
    WHEN pg_get_constraintdef(oid) LIKE '%notes%' THEN '✓ includes notes'
    ELSE '✗ missing notes'
  END as status
FROM pg_constraint
WHERE conname = 'lesson_outputs_type_check';

-- Check indexes
SELECT 
  'Index Check' as check_type,
  indexname,
  indexdef,
  '✓ exists' as status
FROM pg_indexes
WHERE tablename = 'lesson_outputs'
  AND indexname IN ('idx_lesson_outputs_lesson_type', 'idx_lesson_outputs_user_type')
ORDER BY indexname;

-- Summary
SELECT 
  'Summary' as check_type,
  COUNT(*) FILTER (WHERE column_name = 'notes_raw_text') as has_notes_raw_text,
  COUNT(*) FILTER (WHERE column_name = 'notes_final_text') as has_notes_final_text,
  COUNT(*) FILTER (WHERE column_name = 'last_committed_seq') as has_last_committed_seq,
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name IN ('notes_raw_text', 'notes_final_text', 'last_committed_seq')) = 3 
    THEN '✓ All columns present'
    ELSE '⊙ Partial migration'
  END as overall_status
FROM information_schema.columns
WHERE table_name = 'lesson_outputs';
