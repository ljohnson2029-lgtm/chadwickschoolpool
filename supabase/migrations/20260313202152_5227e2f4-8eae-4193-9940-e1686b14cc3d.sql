CREATE POLICY "Parents can create link requests"
ON public.account_links
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() = parent_id) AND (status = 'pending'::text)
);