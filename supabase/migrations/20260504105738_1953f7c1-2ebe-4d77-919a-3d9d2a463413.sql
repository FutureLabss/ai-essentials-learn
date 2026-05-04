-- 1. Notifications: prevent users from inserting notifications for others
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "No direct user inserts on notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (false);

-- 2. Make certificates bucket private
UPDATE storage.buckets SET public = false WHERE id = 'certificates';

-- 3. Restrict quiz_questions SELECT so learners cannot see correct_answer/explanation
DROP POLICY IF EXISTS "Authenticated can view quiz questions" ON public.quiz_questions;

-- Admins/tutors can still SELECT full rows via existing ALL policies.
-- Provide a sanitized view for learners (no correct_answer / explanation).
CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = true) AS
SELECT
  id,
  quiz_id,
  question_text,
  question_type,
  options,
  question_order,
  created_at
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_public TO authenticated;

-- Allow learners read access to questions only via the sanitized view path:
-- Re-add a SELECT policy on the base table that excludes the answer key columns
-- by allowing select but having the app/view use security_invoker. Since PG RLS
-- can't filter columns, we instead require base-table SELECT to be admin/tutor only.
-- The view above runs as invoker, so it relies on this base policy:
CREATE POLICY "Staff can view full quiz questions"
  ON public.quiz_questions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'tutor')
  );

-- For learners, expose questions through a SECURITY DEFINER function that strips answers.
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_learner(_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  question_text text,
  question_type text,
  options jsonb,
  question_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.quiz_id, q.question_text, q.question_type, q.options, q.question_order
  FROM public.quiz_questions q
  WHERE q.quiz_id = _quiz_id
  ORDER BY q.question_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_learner(uuid) TO authenticated;

-- Server-side grading function so clients never need correct_answer
CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(
  _quiz_id uuid,
  _answers jsonb
)
RETURNS TABLE (
  question_id uuid,
  correct_answer text,
  explanation text,
  is_correct boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.correct_answer,
    q.explanation,
    (_answers ->> q.id::text) IS NOT DISTINCT FROM q.correct_answer
  FROM public.quiz_questions q
  WHERE q.quiz_id = _quiz_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid, jsonb) TO authenticated;

-- 4. Realtime channel authorization: restrict notifications topic to the owner
-- The realtime.messages table requires RLS with topic-scoped policies.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification topic" ON realtime.messages;
CREATE POLICY "Users can read own notification topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'notifications:' || auth.uid()::text
    OR realtime.topic() NOT LIKE 'notifications:%'
  );
