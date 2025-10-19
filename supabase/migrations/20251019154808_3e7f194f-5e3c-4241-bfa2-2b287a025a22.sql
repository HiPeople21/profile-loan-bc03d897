-- Clear all data from tables (in correct order due to foreign keys)
DELETE FROM public.repayments;
DELETE FROM public.investments;
DELETE FROM public.loan_requests;
DELETE FROM public.borrower_profiles;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;