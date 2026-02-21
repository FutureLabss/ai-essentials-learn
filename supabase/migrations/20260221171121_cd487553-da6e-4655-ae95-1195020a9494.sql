
-- Add unique constraint on enrollments for upsert
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);

-- Allow users to update their own enrollments (needed for payment flow)
CREATE POLICY "Users can update own enrollment"
ON public.enrollments
FOR UPDATE
USING (auth.uid() = user_id);
