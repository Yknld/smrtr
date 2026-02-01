-- One-off: link an existing interactive module (in lesson_assets) to a lesson for testing.
-- Run this in Supabase SQL Editor so "Lesson 1" (or the lesson you open in Interact) loads that module.
--
-- Prerequisites:
-- 1. The module must already exist in storage at the path below (lesson_assets bucket).
--    Example: user_id/lesson_id/interactive_pages/module_id/ with manifest.json and assets.
-- 2. Replace lesson_id below with the actual lesson_id for the lesson you open in the app
--    (e.g. the lesson shown as "Lesson 1"). Same for user_id if different.
--
-- Storage prefix from RUNPOD.md (module that was pushed earlier):
-- 2202c52b-a017-4f1a-8330-24c9eb5224c4/0fed25d6-899d-49c5-89b8-238658cec1be/interactive_pages/module-d9a45632-8268-49a8-b3bd-2b56ff358963-u1

INSERT INTO lesson_outputs (user_id, lesson_id, type, status, content_json)
SELECT
  '2202c52b-a017-4f1a-8330-24c9eb5224c4',
  '34b9a0c7-62d7-4002-a642-00488b2c7f7c',
  'interactive_pages',
  'ready',
  '{"storage_prefix":"2202c52b-a017-4f1a-8330-24c9eb5224c4/0fed25d6-899d-49c5-89b8-238658cec1be/interactive_pages/module-d9a45632-8268-49a8-b3bd-2b56ff358963-u1","module_id":"module-d9a45632-8268-49a8-b3bd-2b56ff358963-u1"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM lesson_outputs
  WHERE lesson_id = '34b9a0c7-62d7-4002-a642-00488b2c7f7c' AND type = 'interactive_pages'
);

