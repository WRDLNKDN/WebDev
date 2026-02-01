-- Ensure handles are lowercase and no weird characters
ALTER TABLE profiles 
ADD CONSTRAINT check_handle_format 
CHECK (handle ~* '^[a-z0-9-]+$');

-- Ensure no one can take 'admin' or 'login' as a handle
-- (Reserved Keywords Protection)
ALTER TABLE profiles
ADD CONSTRAINT reserved_handles
CHECK (handle NOT IN ('admin', 'login', 'signup', 'directory', 'dashboard'));