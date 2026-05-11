
-- Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teaching_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'non_teaching_staff';

-- Classrooms
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Cohorts
CREATE TABLE public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

-- Staff <-> Classroom assignments
CREATE TABLE public.staff_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL CHECK (staff_role IN ('teaching','non_teaching')),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, classroom_id)
);
ALTER TABLE public.staff_classrooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_staff_classrooms_user ON public.staff_classrooms(user_id);
CREATE INDEX idx_staff_classrooms_classroom ON public.staff_classrooms(classroom_id);

-- Per-classroom granular permissions
CREATE TABLE public.classroom_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, classroom_id, permission)
);
ALTER TABLE public.classroom_permissions ENABLE ROW LEVEL SECURITY;

-- Staff invitations
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  staff_role TEXT NOT NULL CHECK (staff_role IN ('teaching','non_teaching')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(lower(email));
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);

-- Class schedules
CREATE TABLE public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  meeting_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Attendance sessions
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.class_schedules(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Attendance records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Cohort enrollments (students <-> cohort)
CREATE TABLE public.cohort_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cohort_id, user_id)
);
ALTER TABLE public.cohort_enrollments ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_classroom_staff(_user UUID, _classroom UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.staff_classrooms WHERE user_id = _user AND classroom_id = _classroom);
$$;

CREATE OR REPLACE FUNCTION public.is_teaching_staff(_user UUID, _classroom UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.staff_classrooms WHERE user_id = _user AND classroom_id = _classroom AND staff_role = 'teaching');
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_staff_for_cohort(_user UUID, _cohort UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.cohorts c
    JOIN public.staff_classrooms sc ON sc.classroom_id = c.classroom_id
    WHERE c.id = _cohort AND sc.user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teaching_staff_for_cohort(_user UUID, _cohort UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.cohorts c
    JOIN public.staff_classrooms sc ON sc.classroom_id = c.classroom_id
    WHERE c.id = _cohort AND sc.user_id = _user AND sc.staff_role = 'teaching'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_in_cohort(_user UUID, _cohort UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.cohort_enrollments WHERE user_id = _user AND cohort_id = _cohort);
$$;

-- Update timestamp trigger for classrooms
CREATE TRIGGER trg_classrooms_updated BEFORE UPDATE ON public.classrooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS POLICIES =====

-- classrooms
CREATE POLICY "Admins manage classrooms" ON public.classrooms FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Assigned staff view classrooms" ON public.classrooms FOR SELECT
  USING (is_classroom_staff(auth.uid(), id));

-- cohorts
CREATE POLICY "Admins manage cohorts" ON public.cohorts FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Teaching staff manage cohorts" ON public.cohorts FOR ALL
  USING (is_teaching_staff(auth.uid(), classroom_id))
  WITH CHECK (is_teaching_staff(auth.uid(), classroom_id));
CREATE POLICY "Classroom staff view cohorts" ON public.cohorts FOR SELECT
  USING (is_classroom_staff(auth.uid(), classroom_id));
CREATE POLICY "Cohort members view own cohort" ON public.cohorts FOR SELECT
  USING (is_in_cohort(auth.uid(), id));

-- staff_classrooms
CREATE POLICY "Admins manage staff_classrooms" ON public.staff_classrooms FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own assignments" ON public.staff_classrooms FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Teaching staff view classroom team" ON public.staff_classrooms FOR SELECT
  USING (is_teaching_staff(auth.uid(), classroom_id));

-- classroom_permissions
CREATE POLICY "Admins manage classroom_permissions" ON public.classroom_permissions FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own permissions" ON public.classroom_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- staff_invitations
CREATE POLICY "Admins manage invitations" ON public.staff_invitations FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Invitee can view own invitation by email" ON public.staff_invitations FOR SELECT
  USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

-- class_schedules
CREATE POLICY "Admins manage schedules" ON public.class_schedules FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Teaching staff manage schedules" ON public.class_schedules FOR ALL
  USING (is_teaching_staff_for_cohort(auth.uid(), cohort_id))
  WITH CHECK (is_teaching_staff_for_cohort(auth.uid(), cohort_id));
CREATE POLICY "Classroom staff view schedules" ON public.class_schedules FOR SELECT
  USING (is_classroom_staff_for_cohort(auth.uid(), cohort_id));
CREATE POLICY "Cohort members view schedules" ON public.class_schedules FOR SELECT
  USING (is_in_cohort(auth.uid(), cohort_id));

-- attendance_sessions
CREATE POLICY "Admins manage attendance sessions" ON public.attendance_sessions FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Teaching staff manage attendance sessions" ON public.attendance_sessions FOR ALL
  USING (is_teaching_staff_for_cohort(auth.uid(), cohort_id))
  WITH CHECK (is_teaching_staff_for_cohort(auth.uid(), cohort_id));
CREATE POLICY "Classroom staff view attendance sessions" ON public.attendance_sessions FOR SELECT
  USING (is_classroom_staff_for_cohort(auth.uid(), cohort_id));
CREATE POLICY "Cohort members view attendance sessions" ON public.attendance_sessions FOR SELECT
  USING (is_in_cohort(auth.uid(), cohort_id));

-- attendance_records
CREATE POLICY "Admins view all attendance records" ON public.attendance_records FOR SELECT
  USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Classroom staff view attendance records" ON public.attendance_records FOR SELECT
  USING (EXISTS(
    SELECT 1 FROM public.attendance_sessions s
    WHERE s.id = session_id AND is_classroom_staff_for_cohort(auth.uid(), s.cohort_id)
  ));
CREATE POLICY "Users view own attendance" ON public.attendance_records FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users mark own attendance" ON public.attendance_records FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND EXISTS(
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = session_id AND s.closes_at > now() AND is_in_cohort(auth.uid(), s.cohort_id)
    )
  );

-- cohort_enrollments
CREATE POLICY "Admins manage cohort enrollments" ON public.cohort_enrollments FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Teaching staff manage cohort enrollments" ON public.cohort_enrollments FOR ALL
  USING (is_teaching_staff_for_cohort(auth.uid(), cohort_id))
  WITH CHECK (is_teaching_staff_for_cohort(auth.uid(), cohort_id));
CREATE POLICY "Classroom staff view enrollments" ON public.cohort_enrollments FOR SELECT
  USING (is_classroom_staff_for_cohort(auth.uid(), cohort_id));
CREATE POLICY "Users view own enrollment" ON public.cohort_enrollments FOR SELECT
  USING (auth.uid() = user_id);
