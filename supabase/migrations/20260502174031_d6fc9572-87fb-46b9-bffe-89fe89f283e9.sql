-- Points ledger (append-only)
CREATE TABLE public.point_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  reference_id TEXT,
  points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type, reference_id)
);

CREATE INDEX idx_point_events_user ON public.point_events(user_id);
CREATE INDEX idx_point_events_created ON public.point_events(created_at DESC);

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point events"
ON public.point_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all point events"
ON public.point_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Aggregated stats
CREATE TABLE public.user_gamification (
  user_id UUID NOT NULL PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  leaderboard_opt_in BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_gamification_points ON public.user_gamification(total_points DESC);

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification"
ON public.user_gamification FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view opted-in leaderboard entries"
ON public.user_gamification FOR SELECT
USING (leaderboard_opt_in = true);

CREATE POLICY "Users can update own opt-in"
ON public.user_gamification FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all gamification"
ON public.user_gamification FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Badge catalog
CREATE TABLE public.badges (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view badges"
ON public.badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User badge unlocks
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view user badges"
ON public.user_badges FOR SELECT
TO authenticated
USING (true);

-- Seed badges
INSERT INTO public.badges (id, name, description, icon, category) VALUES
('first_step', 'First Step', 'Complete your first lesson', 'Footprints', 'progression'),
('week_warrior', 'Week Warrior', 'Complete an entire week', 'Calendar', 'progression'),
('course_champion', 'Course Champion', 'Earn your first certificate', 'Trophy', 'progression'),
('polymath', 'Polymath', 'Complete 2 or more courses', 'GraduationCap', 'progression'),
('on_fire', 'On Fire', 'Maintain a 3-day streak', 'Flame', 'streak'),
('unstoppable', 'Unstoppable', 'Maintain a 7-day streak', 'Zap', 'streak'),
('devoted', 'Devoted', 'Maintain a 30-day streak', 'Crown', 'streak'),
('perfect_score', 'Perfect Score', 'Get 100% on a quiz', 'Star', 'quality'),
('helpful_voice', 'Helpful Voice', 'Post 10 discussion comments', 'MessageCircle', 'quality'),
('reviewer', 'Reviewer', 'Leave a course review', 'PenLine', 'quality'),
('early_bird', 'Early Bird', 'Joined in the first month', 'Sunrise', 'special'),
('quiz_master', 'Quiz Master', 'Pass 5 quizzes', 'Brain', 'progression'),
('dedicated_learner', 'Dedicated Learner', 'Earn 500 points', 'Award', 'progression');