-- Allow users to insert their own first role (not admin role)
CREATE POLICY "Users can insert own first role" ON public.user_roles
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('borrower', 'investor')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);