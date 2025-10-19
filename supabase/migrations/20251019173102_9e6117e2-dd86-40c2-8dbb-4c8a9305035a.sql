-- Allow authenticated users to view all profiles
-- This is necessary for users to see borrower names on loan requests
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can view own profile details"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);