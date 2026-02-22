-- Allow admins to delete certificates (needed for reissue functionality)
CREATE POLICY "Admins can delete certificates"
ON public.certificates
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
