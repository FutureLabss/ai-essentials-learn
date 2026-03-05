
-- Allow tutors to manage courses
CREATE POLICY "Tutors can manage courses"
ON public.courses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'tutor'::app_role))
WITH CHECK (has_role(auth.uid(), 'tutor'::app_role));

-- Allow tutors to manage weeks
CREATE POLICY "Tutors can manage weeks"
ON public.weeks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'tutor'::app_role))
WITH CHECK (has_role(auth.uid(), 'tutor'::app_role));

-- Allow tutors to manage lessons
CREATE POLICY "Tutors can manage lessons"
ON public.lessons FOR ALL TO authenticated
USING (has_role(auth.uid(), 'tutor'::app_role))
WITH CHECK (has_role(auth.uid(), 'tutor'::app_role));
