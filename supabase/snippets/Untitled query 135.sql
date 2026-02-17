-- 1. Ensure RLS is actually on
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to see their own profile (and others, usually)
CREATE POLICY "Public profiles are viewable by everyone." 
ON profiles FOR SELECT 
USING (true);

-- 3. THE CRITICAL FIX: Allow users to UPDATE their own data
CREATE POLICY "Users can update their own profiles." 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);