-- Create the Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamptz default now(),
  
  -- Handle/Gamertag
  handle text unique not null,
  
  -- Geek/Nerd Creds (JSONB allows for flexible 'fandom' tags)
  geek_creds text[], -- Subjects/topics they geek out about
  nerd_creds jsonb,   -- Games, fandoms, preferences
  
  -- Pronoun preferences
  pronouns text,
  
  -- Social handles
  socials jsonb default '{
    "discord": null,
    "reddit": null,
    "github": null
  }'::jsonb,

  constraint handle_length check (char_length(handle) >= 3)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy: Everyone can read profiles
create policy "Profiles are viewable by everyone." 
  on profiles for select using (true);

-- Policy: Users can only edit their own profile
create policy "Users can insert their own profile." 
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile." 
  on profiles for update using (auth.uid() = id);