-- Update RLS policies for proper data visibility based on roles

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view borrower profiles" ON public.borrower_profiles;
DROP POLICY IF EXISTS "Anyone can view investments" ON public.investments;
DROP POLICY IF EXISTS "Anyone can view loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Anyone can view repayments" ON public.repayments;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Profiles: Only admins can view all, users can view their own
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Borrower profiles: Investors and admins can view, borrowers can view their own
CREATE POLICY "Borrowers can view own profile" ON public.borrower_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Investors can view borrower profiles" ON public.borrower_profiles
FOR SELECT USING (has_role(auth.uid(), 'investor'));

CREATE POLICY "Admins can view all borrower profiles" ON public.borrower_profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Loan requests: Investors and admins can view, borrowers can view their own
CREATE POLICY "Borrowers can view own loan requests" ON public.loan_requests
FOR SELECT USING (auth.uid() = borrower_id);

CREATE POLICY "Investors can view all loan requests" ON public.loan_requests
FOR SELECT USING (has_role(auth.uid(), 'investor'));

CREATE POLICY "Admins can view all loan requests" ON public.loan_requests
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Investments: Only admins and the investor who made the investment can view
CREATE POLICY "Investors can view own investments" ON public.investments
FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "Admins can view all investments" ON public.investments
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Borrowers can view investments on their loans" ON public.investments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM loan_requests
    WHERE loan_requests.id = investments.loan_id
    AND loan_requests.borrower_id = auth.uid()
  )
);

-- Repayments: Borrower of the loan and investors in the loan can view
CREATE POLICY "Loan owners can view repayments" ON public.repayments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM loan_requests
    WHERE loan_requests.id = repayments.loan_id
    AND loan_requests.borrower_id = auth.uid()
  )
);

CREATE POLICY "Investors can view repayments on their investments" ON public.repayments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM investments
    WHERE investments.loan_id = repayments.loan_id
    AND investments.investor_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all repayments" ON public.repayments
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Add DELETE policies where needed
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete borrower profiles" ON public.borrower_profiles
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete loan requests" ON public.loan_requests
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete investments" ON public.investments
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete repayments" ON public.repayments
FOR DELETE USING (has_role(auth.uid(), 'admin'));