# Daily Word Puzzle

Daily Word is a single daily word puzzle (Wordle-style) available from the Games
surface. One puzzle is generated for all players each calendar day; users have
up to six attempts to guess the hidden 5-letter word and receive letter-based
hints after each guess.

## Overview

- **Type:** Solo, one puzzle per day (shared across all players).
- **Route:** `/dashboard/games/daily-word` and
  `/dashboard/games/daily-word/:sessionId`.
- **Access:** Authenticated; Games feature flag.

## Behavior

1. **Daily puzzle:** The same 5-letter word is used for everyone for a given
   calendar day (UTC). The word is chosen deterministically from the
   `daily_puzzle_words` table using the date as a seed.
2. **Attempts:** Up to 6 guesses. Each guess must be a valid 5-letter word from
   the puzzle word list.
3. **Hints (after each guess):**
   - **Correct (green):** Letter is in the word and in the correct position.
   - **Present (yellow):** Letter is in the word but in a different position
     (occurrence count respected).
   - **Absent (gray):** Letter is not in the word (or excess occurrences).
4. **Result:** The round ends on a correct guess (win) or after 6 guesses
   (loss). Result is stored on the game session.
5. **Share:** Users can copy a shareable summary (e.g. emoji grid and date) to
   the clipboard to share with connections or elsewhere. No in-app “post to
   feed” or “send to connection” is required for MVP; copy-to-clipboard is
   sufficient.

## Data

- **Game definition:** `daily_word` (solo, 1–1).
- **Tables:** `daily_puzzle_words` (id, word) — 5-letter words only; used for
  both solution and allowed guesses.
- **Session state:** `puzzleDate` (YYYY-MM-DD), `guesses` (array of
  `{ word, hints }`).
- **RPCs:**
  - `get_or_create_daily_word_session()` — Returns session id for today’s puzzle
    (creates if none).
  - `submit_daily_word_guess(session_id, guess)` — Validates guess, returns
    hints and game-over flag; updates session.

## UX

- Grid: 6 rows × 5 cells; filled rows show letters with green/yellow/gray
  background.
- On-screen keyboard and physical keyboard (type + Enter to submit, Backspace to
  delete).
- After completion: “Share results” copies a text block (e.g. “Daily Word
  M/D/YYYY” + emoji rows) to the clipboard.

## References

- Games surface: Dashboard → Games; solo game “Daily Word.”
- [Games index](./README.md) — List of game docs.
