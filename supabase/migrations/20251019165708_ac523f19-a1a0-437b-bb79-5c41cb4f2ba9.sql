-- Create a trigger to automatically create a borrower profile for every new user
-- This ensures every user has a track record initialized

CREATE OR REPLACE FUNCTION public.create_borrower_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a borrower profile for the new user with default track record values
  INSERT INTO public.borrower_profiles (user_id, successful_loans_count, defaults_count)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_borrower_profile();