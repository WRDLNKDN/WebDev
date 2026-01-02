-- 1. Create a local test user in the Auth schema
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- The "Fixed ID" for your dev profile
    'prophet118@example.com',
    crypt('password123', gen_salt('bf')), -- Activation Energy for local login
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    '', '', '', '00000000-0000-0000-0000-000000000000'
) ON CONFLICT (id) DO NOTHING;

-- 2. Now the Profile insert will pass the Verification check
INSERT INTO public.profiles (id, handle, geek_creds, nerd_creds, pronouns, socials)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- ID matches the Auth user above
  'Prophet118',
  '{"Circuit Board Repair", "Monday Night Wars", "Human OS Logic"}',
  '{
    "games": ["Animal Crossing", "No Mans Sky"],
    "fandoms": ["Doctor Who", "Star Trek Next Gen"]
  }',
  'he/him',
  '{"discord": "prophet118#0000", "reddit": "u/prophet118"}'
) ON CONFLICT (id) DO NOTHING;