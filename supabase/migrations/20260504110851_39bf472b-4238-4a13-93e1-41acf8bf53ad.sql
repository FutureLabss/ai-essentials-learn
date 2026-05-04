
-- 1. enrollments: prevent self-granting payment/unlock
DROP POLICY IF EXISTS "Users can insert own enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollment" ON public.enrollments;

CREATE POLICY "Users can insert own enrollment"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_paid = false
  AND is_unlocked = false
);

-- No user UPDATE policy: unlocking/payment status flips happen via service role (paystack edge fn) or admins.

-- 2. lesson_discussions: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated can view discussions" ON public.lesson_discussions;
CREATE POLICY "Authenticated can view discussions"
ON public.lesson_discussions
FOR SELECT
TO authenticated
USING (true);

-- 3. course_reviews: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.course_reviews;
CREATE POLICY "Authenticated can view reviews"
ON public.course_reviews
FOR SELECT
TO authenticated
USING (true);

-- 4. user_gamification leaderboard: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view opted-in leaderboard entries" ON public.user_gamification;
CREATE POLICY "Authenticated can view opted-in leaderboard entries"
ON public.user_gamification
FOR SELECT
TO authenticated
USING (leaderboard_opt_in = true);
