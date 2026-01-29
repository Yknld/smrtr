-- Check lesson_assets table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lesson_assets'
ORDER BY ordinal_position;
