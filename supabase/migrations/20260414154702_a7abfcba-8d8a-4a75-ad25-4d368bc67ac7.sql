
ALTER TABLE public.lessons
ADD COLUMN slide_url text DEFAULT NULL,
ADD COLUMN pdf_url text DEFAULT NULL;
