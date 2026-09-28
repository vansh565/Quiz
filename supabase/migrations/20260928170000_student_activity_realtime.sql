CREATE TABLE IF NOT EXISTS public.student_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  student_name text NOT NULL CHECK (length(student_name) BETWEEN 1 AND 100),
  class_level text NOT NULL DEFAULT 'Classes 6-8',
  event_type text NOT NULL CHECK (event_type IN ('student_started', 'quiz_attempt', 'certificate_awarded')),
  quiz_title text,
  chapter_title text,
  answer_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  passed boolean,
  score_percentage numeric CHECK (score_percentage IS NULL OR score_percentage BETWEEN 0 AND 100),
  correct_count integer,
  wrong_count integer,
  total_questions integer,
  certificate_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_activity
  ADD COLUMN IF NOT EXISTS answer_details jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_student_activity_created_at
  ON public.student_activity (created_at DESC);

ALTER TABLE public.student_activity ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_student_activity()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_student_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_student_activity() TO authenticated;

DROP POLICY IF EXISTS "students_record_activity" ON public.student_activity;
CREATE POLICY "students_record_activity" ON public.student_activity
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins_read_student_activity" ON public.student_activity;
CREATE POLICY "admins_read_student_activity" ON public.student_activity
  FOR SELECT TO authenticated
  USING (public.can_manage_student_activity());

GRANT INSERT ON public.student_activity TO anon, authenticated;
GRANT SELECT ON public.student_activity TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'student_activity'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_activity;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
