-- SQLite schema for Games (mirror of Supabase game tables).
-- Use for local dev, testing, or backup. Primary app persistence remains Supabase.
--
-- Create DB: sqlite3 data/games.db < scripts/games-sqlite-schema.sql
-- Or: mkdir -p data && sqlite3 data/games.db < scripts/games-sqlite-schema.sql

-- Game definitions (registry of game types)
CREATE TABLE IF NOT EXISTS game_definitions (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_players INTEGER NOT NULL DEFAULT 1,
  max_players INTEGER NOT NULL DEFAULT 1,
  is_solo_capable INTEGER NOT NULL DEFAULT 1,
  is_multiplayer_capable INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  capabilities TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Game sessions (one per match; state_payload holds game-specific state)
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  game_definition_id TEXT NOT NULL REFERENCES game_definitions(id),
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_invitation', 'active', 'waiting_players',
    'waiting_your_move', 'waiting_opponent_move', 'completed', 'declined', 'canceled', 'expired'
  )),
  state_payload TEXT DEFAULT '{}',
  result TEXT CHECK (result IS NULL OR result IN ('winner', 'loser', 'draw', 'solved', 'failed', 'abandoned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_created_by ON game_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_definition ON game_sessions(game_definition_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_updated_at ON game_sessions(updated_at DESC);

-- Participants in a session
CREATE TABLE IF NOT EXISTS game_session_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('creator', 'invitee', 'player')),
  acceptance_state TEXT NOT NULL DEFAULT 'pending' CHECK (acceptance_state IN ('pending', 'accepted', 'declined')),
  turn_order_position INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_session_participants_session ON game_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_game_session_participants_user ON game_session_participants(user_id);

-- Invitations (one per recipient per session)
CREATE TABLE IF NOT EXISTS game_invitations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'canceled', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, recipient_id),
  CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_game_invitations_recipient ON game_invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_sender ON game_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_session ON game_invitations(session_id);

-- Optional audit trail
CREATE TABLE IF NOT EXISTS game_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('move', 'turn_advance', 'completion', 'system')),
  actor_id TEXT,
  payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_events_session ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(session_id, created_at DESC);

-- Trivia question bank
CREATE TABLE IF NOT EXISTS trivia_questions (
  id TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  choices TEXT DEFAULT '[]',
  category TEXT,
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trivia_questions_category ON trivia_questions(category);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_difficulty ON trivia_questions(difficulty);

-- Would You Rather prompt bank (two-option prompts)
CREATE TABLE IF NOT EXISTS would_you_rather_prompts (
  id TEXT PRIMARY KEY,
  text_a TEXT NOT NULL,
  text_b TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Hangman word list (optional, for local Hangman)
CREATE TABLE IF NOT EXISTS hangman_words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hangman_words_word_lower ON hangman_words(lower(word));
