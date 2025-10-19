-- Update RLS policies to allow all authenticated users to access everything

-- Drop old restrictive policies on loan_requests
DROP POLICY IF EXISTS "Borrowers can create loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Borrowers can update own loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Borrowers can view own loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Investors can view all loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Admins can view all loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Admins can delete loan requests" ON public.loan_requests;

-- Create new policies for loan_requests - all authenticated users can view all and create/update their own
CREATE POLICY "Authenticated users can view all loan requests"
ON public.loan_requests
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create loan requests"
ON public.loan_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Users can update own loan requests"
ON public.loan_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = borrower_id);

CREATE POLICY "Users can delete own loan requests"
ON public.loan_requests
FOR DELETE
TO authenticated
USING (auth.uid() = borrower_id);

-- Update investments policies
DROP POLICY IF EXISTS "Investors can create investments" ON public.investments;
DROP POLICY IF EXISTS "Investors can view own investments" ON public.investments;
DROP POLICY IF EXISTS "Borrowers can view investments on their loans" ON public.investments;
DROP POLICY IF EXISTS "Admins can view all investments" ON public.investments;
DROP POLICY IF EXISTS "Admins can delete investments" ON public.investments;

CREATE POLICY "Authenticated users can create investments"
ON public.investments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Users can view own investments"
ON public.investments
FOR SELECT
TO authenticated
USING (auth.uid() = investor_id);

CREATE POLICY "Loan owners can view investments on their loans"
ON public.investments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM loan_requests
  WHERE loan_requests.id = investments.loan_id
  AND loan_requests.borrower_id = auth.uid()
));

-- Update borrower_profiles policies to allow everyone to view and users to manage their own
DROP POLICY IF EXISTS "Borrowers can insert own profile" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Borrowers can update own profile" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Borrowers can view own profile" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Investors can view borrower profiles" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Admins can view all borrower profiles" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Admins can delete borrower profiles" ON public.borrower_profiles;

CREATE POLICY "Authenticated users can view all borrower profiles"
ON public.borrower_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own borrower profile"
ON public.borrower_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own borrower profile"
ON public.borrower_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Update profiles to allow viewing of all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Repayments policies remain mostly the same
DROP POLICY IF EXISTS "Loan owner can create repayments" ON public.repayments;
DROP POLICY IF EXISTS "Loan owners can view repayments" ON public.repayments;
DROP POLICY IF EXISTS "Investors can view repayments on their investments" ON public.repayments;
DROP POLICY IF EXISTS "Admins can view all repayments" ON public.repayments;
DROP POLICY IF EXISTS "Admins can delete repayments" ON public.repayments;

CREATE POLICY "Loan owners can create repayments"
ON public.repayments
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM loan_requests
  WHERE loan_requests.id = repayments.loan_id
  AND loan_requests.borrower_id = auth.uid()
));

CREATE POLICY "Loan owners can view their repayments"
ON public.repayments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM loan_requests
  WHERE loan_requests.id = repayments.loan_id
  AND loan_requests.borrower_id = auth.uid()
));

CREATE POLICY "Investors can view repayments on their investments"
ON public.repayments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM investments
  WHERE investments.loan_id = repayments.loan_id
  AND investments.investor_id = auth.uid()
));