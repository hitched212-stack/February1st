-- Remove AI Coach schema objects
-- Safe to run even if objects were already removed.

DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
