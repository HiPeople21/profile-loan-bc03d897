-- Wipe all data from the database tables
-- Delete in order to respect foreign key constraints

-- First delete dependent records
DELETE FROM public.repayments;
DELETE FROM public.investments;

-- Then delete loan requests
DELETE FROM public.loan_requests;

-- Delete borrower profiles
DELETE FROM public.borrower_profiles;

-- Delete user roles
DELETE FROM public.user_roles;

-- Delete profiles (this will cascade to borrower_profiles via trigger)
DELETE FROM public.profiles;

-- Note: This does not delete auth.users as that's in the auth schema
-- If you need to delete users too, you'll need to do that through the auth system