-- Clear all user-related data
DELETE FROM public.repayments;
DELETE FROM public.investments;
DELETE FROM public.loan_requests;
DELETE FROM public.borrower_profiles;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Clear auth users (this will cascade delete all related data)
DELETE FROM auth.users;