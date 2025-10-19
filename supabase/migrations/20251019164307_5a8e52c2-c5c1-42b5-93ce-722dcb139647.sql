-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users who don't have profiles
INSERT INTO public.profiles (id, full_name)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;