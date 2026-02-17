-- 1. Clean the slate
DROP POLICY IF EXISTS "Users can update their own profiles." ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "allow_update_own" ON profiles;

-- 2. Force Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Explicitly Grant Permissions to the Authenticated Role
-- Sometimes the role needs a direct 'GRANT' before the policy can work
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE profiles TO service_role;

-- 4. Re-establish the SELECT Policy (Read Access)
CREATE POLICY "Public profiles are viewable by everyone." 
ON profiles FOR SELECT 
USING (true);

-- 5. Re-establish the UPDATE Policy (Write Access)
-- This logic ensures the caller's UUID matches the row being changed
CREATE POLICY "Users can update their own profiles." 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 6. Re-establish the INSERT Policy (Just in case your login flow needs it)
CREATE POLICY "Users can insert their own profile."
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);