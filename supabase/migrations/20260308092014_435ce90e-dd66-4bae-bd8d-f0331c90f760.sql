
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_type text NOT NULL,
  reference_id text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_type, reference_id)
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.email_logs
  FOR ALL USING (false);

CREATE POLICY "Admins can view email logs" ON public.email_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
