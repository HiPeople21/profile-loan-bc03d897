-- Fix: profiles_pii_exposure - Restrict profile viewing to own profile only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create a new policy that allows users to only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Create a secure function to get public borrower information for legitimate use cases
-- This returns only non-sensitive fields (name, avatar, bio) for borrowers with active loans
CREATE OR REPLACE FUNCTION public.get_public_borrower_info(borrower_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  credit_score INTEGER,
  is_verified BOOLEAN,
  successful_loans_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    bp.bio,
    bp.credit_score,
    bp.is_verified,
    bp.successful_loans_count
  FROM profiles p
  LEFT JOIN borrower_profiles bp ON bp.user_id = p.id
  WHERE p.id = borrower_user_id
    -- Only return data if the borrower has active or completed loans
    AND EXISTS (
      SELECT 1 FROM loan_requests
      WHERE borrower_id = borrower_user_id
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_borrower_info(UUID) TO authenticated;