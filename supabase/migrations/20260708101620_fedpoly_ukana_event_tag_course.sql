-- "Tag" course for the FedPoly Ukana talk signup page (/signup?event=fedpoly-ukana).
-- Not real curriculum content — enrolling attendees here lets Admin > Email
-- target this specific cohort via the existing "Course enrollees" filter,
-- without emailing every other learner on the platform.
INSERT INTO public.courses (name, description, duration_weeks, price_ngn, is_hidden)
SELECT
  'FedPoly Ukana — AI Essentials Talk',
  'Signups collected at the AI Essentials talk, Federal Polytechnic Ukana.',
  0,
  0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.courses WHERE name = 'FedPoly Ukana — AI Essentials Talk'
);
