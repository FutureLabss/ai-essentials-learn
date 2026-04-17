-- Pending tutor invitations table
CREATE TABLE public.pending_tutor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_tutor_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invitations"
  ON public.pending_tutor_invitations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invitations"
  ON public.pending_tutor_invitations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations"
  ON public.pending_tutor_invitations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user to auto-promote pending tutors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_pending_tutor BOOLEAN;
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner');

  -- Check pending tutor invitation
  SELECT EXISTS (
    SELECT 1 FROM public.pending_tutor_invitations
    WHERE lower(email) = lower(NEW.email)
  ) INTO is_pending_tutor;

  IF is_pending_tutor THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'tutor')
    ON CONFLICT DO NOTHING;

    DELETE FROM public.pending_tutor_invitations
    WHERE lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$function$;