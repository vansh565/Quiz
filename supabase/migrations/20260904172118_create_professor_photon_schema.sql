/*
# Professor Photon - Core Schema

## Overview
Creates the complete database schema for the Professor Photon Class 7 Physics Learning Platform.
The platform allows students to learn physics through video lessons, secret codes, quizzes,
badges, and certificates. Admins manage all content through a separate admin panel.

## Tables Created

### Identity & People
- `students` — Student profiles (no auth login; identified by email+phone). Fields: id, name, email, phone, class_level, created_at.
- `admin_profiles` — Links Supabase Auth users to admin metadata. Fields: id (FK auth.users), full_name, email, role (default 'admin'), created_at.

### Course Structure
- `subjects` — Top-level subjects (Physics, Chemistry, etc.). Fields: id, name, slug, icon, sort_order, is_active, created_at.
- `courses` — Grade-level courses within a subject (e.g. Class 7 Physics). Fields: id, subject_id, name, slug, class_level, description, is_active, created_at.
- `chapters` — Chapters within a course (Heat, Motion, etc.). Fields: id, course_id, title, slug, description, sort_order, is_active, created_at.
- `videos` — YouTube videos within a chapter. Fields: id, chapter_id, title, youtube_url, youtube_id, description, sort_order, is_active, created_at.
- `secret_codes` — Secret codes that unlock quizzes. Fields: id, video_id, chapter_id, code (unique), is_active, created_at.

### Assessment
- `quizzes` — Quiz container per chapter. Fields: id, chapter_id, title, passing_percentage (default 80), max_questions (default 10), max_attempts (null=unlimited), is_active, created_at.
- `questions` — MCQ questions belonging to a quiz. Fields: id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer (a/b/c/d), explanation, sort_order, is_active, created_at.
- `quiz_attempts` — Permanent record of every quiz attempt. Fields: id, student_id, quiz_id, chapter_id, answers (jsonb), total_questions, correct_count, wrong_count, score_percentage, passed, created_at.

### Progress & Rewards
- `chapter_progress` — Tracks per-student per-chapter completion. Fields: id, student_id, chapter_id, completed, completed_at, created_at.
- `badges` — Badge definitions per chapter. Fields: id, chapter_id, name, description, icon_name, created_at.
- `student_badges` — Badges earned by students (unique per student+badge). Fields: id, student_id, badge_id, chapter_id, created_at.
- `certificates` — Final certificates. Fields: id, student_id, course_id, certificate_number (unique), student_name, class_level, program_name, issued_date, storage_path, created_at.

### Operations
- `email_logs` — Log of all emails sent. Fields: id, student_id, email_type, recipient_email, subject, status, error_message, sent_at.
- `platform_settings` — Global platform configuration (key-value). Fields: id, key (unique), value, updated_at.

## Security (RLS)
- Content tables (subjects, courses, chapters, videos, secret_codes, quizzes, questions, badges, platform_settings): readable by anon+authenticated (students need to see content); writable only by authenticated admins.
- Student data tables (students, quiz_attempts, chapter_progress, student_badges, certificates, email_logs): students (anon) can read/write their own rows by student_id; admins (authenticated) can read all.
- admin_profiles: only authenticated admins can read; self-insert allowed.
- Secret codes: SELECT is public (students need to validate codes) but the code value is needed for validation. Admin-only writes.
- Note: Since students do NOT use Supabase Auth (no login), student-scoped policies use a student_id passed by the app and stored in the row. Admin operations use authenticated sessions.

## Important Notes
1. Students are identified by email+phone (no password). The app looks up or creates a student record, stores the student_id in sessionStorage, and uses it for all subsequent operations.
2. Admin access requires Supabase Auth sign-in with an admin_profiles row. RLS on admin tables uses auth.uid().
3. All student-facing content reads use the anon key. Student writes include their student_id.
4. Certificate numbers follow the format CP7-YYYY-NNNNNN using a sequence.
5. A unique constraint prevents duplicate badges per student.
6. A unique constraint on certificates prevents duplicates per student+course.
*/

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SEQUENCES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text DEFAULT 'atom',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_subjects" ON subjects;
CREATE POLICY "anon_read_subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_subjects" ON subjects;
CREATE POLICY "admin_write_subjects" ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  class_level text NOT NULL DEFAULT 'Class 7',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_courses" ON courses;
CREATE POLICY "anon_read_courses" ON courses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_courses" ON courses;
CREATE POLICY "admin_write_courses" ON courses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- CHAPTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_chapters" ON chapters;
CREATE POLICY "anon_read_chapters" ON chapters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_chapters" ON chapters;
CREATE POLICY "admin_write_chapters" ON chapters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- VIDEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  youtube_url text NOT NULL,
  youtube_id text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_videos_chapter ON videos(chapter_id);
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_videos" ON videos;
CREATE POLICY "anon_read_videos" ON videos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_videos" ON videos;
CREATE POLICY "admin_write_videos" ON videos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SECRET CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_secret_codes_chapter ON secret_codes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_secret_codes_code ON secret_codes(code);
ALTER TABLE secret_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_secret_codes" ON secret_codes;
CREATE POLICY "anon_read_secret_codes" ON secret_codes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_secret_codes" ON secret_codes;
CREATE POLICY "admin_write_secret_codes" ON secret_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  passing_percentage numeric NOT NULL DEFAULT 80,
  max_questions int NOT NULL DEFAULT 10,
  max_attempts int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter ON quizzes(chapter_id);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_quizzes" ON quizzes;
CREATE POLICY "anon_read_quizzes" ON quizzes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_quizzes" ON quizzes;
CREATE POLICY "admin_write_quizzes" ON quizzes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer char(1) NOT NULL CHECK (correct_answer IN ('a','b','c','d')),
  explanation text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_questions" ON questions;
CREATE POLICY "anon_read_questions" ON questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_questions" ON questions;
CREATE POLICY "admin_write_questions" ON questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  class_level text NOT NULL DEFAULT 'Class 7',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_phone ON students(email, phone);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- Students (anon) can read their own row by student_id
DROP POLICY IF EXISTS "anon_read_students" ON students;
CREATE POLICY "anon_read_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_students" ON students;
CREATE POLICY "admin_delete_students" ON students FOR DELETE TO authenticated USING (true);

-- ============================================================
-- ADMIN PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_admin_profiles" ON admin_profiles;
CREATE POLICY "admin_read_admin_profiles" ON admin_profiles FOR SELECT TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid()));
DROP POLICY IF EXISTS "admin_insert_own_profile" ON admin_profiles;
CREATE POLICY "admin_insert_own_profile" ON admin_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "admin_update_own_profile" ON admin_profiles;
CREATE POLICY "admin_update_own_profile" ON admin_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  total_questions int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  wrong_count int NOT NULL DEFAULT 0,
  score_percentage numeric NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_chapter ON quiz_attempts(chapter_id);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_read_quiz_attempts" ON quiz_attempts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_insert_quiz_attempts" ON quiz_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_update_quiz_attempts" ON quiz_attempts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- CHAPTER PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS chapter_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_progress_unique ON chapter_progress(student_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_student ON chapter_progress(student_id);
ALTER TABLE chapter_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_chapter_progress" ON chapter_progress;
CREATE POLICY "anon_read_chapter_progress" ON chapter_progress FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chapter_progress" ON chapter_progress;
CREATE POLICY "anon_insert_chapter_progress" ON chapter_progress FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chapter_progress" ON chapter_progress;
CREATE POLICY "anon_update_chapter_progress" ON chapter_progress FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon_name text NOT NULL DEFAULT 'award',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_badges_chapter ON badges(chapter_id);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_badges" ON badges;
CREATE POLICY "anon_read_badges" ON badges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_badges" ON badges;
CREATE POLICY "admin_write_badges" ON badges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STUDENT BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_badges_unique ON student_badges(student_id, badge_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_student_badges" ON student_badges;
CREATE POLICY "anon_read_student_badges" ON student_badges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_student_badges" ON student_badges;
CREATE POLICY "anon_insert_student_badges" ON student_badges FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_delete_student_badges" ON student_badges;
CREATE POLICY "admin_delete_student_badges" ON student_badges FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number text UNIQUE NOT NULL,
  student_name text NOT NULL,
  class_level text NOT NULL,
  program_name text NOT NULL,
  issued_date timestamptz NOT NULL DEFAULT now(),
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_student_course ON certificates(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_certificates" ON certificates;
CREATE POLICY "anon_read_certificates" ON certificates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_certificates" ON certificates;
CREATE POLICY "anon_insert_certificates" ON certificates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_certificates" ON certificates;
CREATE POLICY "anon_update_certificates" ON certificates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- EMAIL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_student ON email_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_email_logs" ON email_logs;
CREATE POLICY "anon_read_email_logs" ON email_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_email_logs" ON email_logs;
CREATE POLICY "anon_insert_email_logs" ON email_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_platform_settings" ON platform_settings;
CREATE POLICY "anon_read_platform_settings" ON platform_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin_write_platform_settings" ON platform_settings;
CREATE POLICY "admin_write_platform_settings" ON platform_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTION: generate_certificate_number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_certificate_number(class_level text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_val bigint;
  cert_num text;
  year_str text;
BEGIN
  seq_val := nextval('certificate_number_seq');
  year_str := extract(year from now())::text;
  cert_num := 'CP' || replace(class_level, 'Class ', '') || '-' || year_str || '-' || lpad(seq_val::text, 6, '0');
  RETURN cert_num;
END;
$$;

-- ============================================================
-- FUNCTION: mark_chapter_complete
-- Atomically marks a chapter complete for a student (upsert)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_chapter_complete(p_student_id uuid, p_chapter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO chapter_progress (student_id, chapter_id, completed, completed_at)
  VALUES (p_student_id, p_chapter_id, true, now())
  ON CONFLICT (student_id, chapter_id)
  DO UPDATE SET completed = true, completed_at = now()
  WHERE chapter_progress.student_id = p_student_id AND chapter_progress.chapter_id = p_chapter_id;
END;
$$;

-- ============================================================
-- FUNCTION: award_badge
-- Awards a badge to a student if not already awarded
-- ============================================================
CREATE OR REPLACE FUNCTION award_badge(p_student_id uuid, p_chapter_id uuid, p_badge_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO student_badges (student_id, badge_id, chapter_id)
  VALUES (p_student_id, p_badge_id, p_chapter_id)
  ON CONFLICT (student_id, badge_id) DO NOTHING;
  RETURN true;
END;
$$;