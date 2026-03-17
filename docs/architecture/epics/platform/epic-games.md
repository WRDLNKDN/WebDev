# Epic: Games — Interactive Social Games Between Connections

[← Docs index](../../README.md)

**Type:** Epic  
**Area:** Application / Social engagement  
**Canonical surface:** Dashboard → Games (`/dashboard/games`)  
**Entry from main nav:** `/games` redirects to `/dashboard/games` when the games
feature flag is on.

Games provide lightweight social interaction between members (solo and with
connections): simple, recognizable games playable in-app with asynchronous turn
support where applicable.

---

## 1. Purpose

- Give members a Games surface reachable from main navigation.
- Support solo games and multiplayer (with connections).
- Game invitations, accept/decline, persistent sessions, turn order, and
  notifications for game events.
- Extensible framework so new games can be added without structural redesign.

---

## 2. Access & Routes

- **Main nav entry:** Explore sidebar and navbar link “All games” →
  `/dashboard/games`.  
  **URL `/games`** (when games flag is on) → redirects to `/dashboard/games`
  (RequireOnboarded + RequireFeatureFlag).
- **Feature flag:** `games`. Dashboard routes also require `DASHBOARD_FLAG`.
- **Auth:** RequireOnboarded; unauthenticated users are redirected
  appropriately.

---

## 3. Acceptance criteria vs implementation

| Criterion                                                 | Status | Notes                                                                                                                                  |
| --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Users can access a Games surface from the main navigation | ✅     | Nav links to `/dashboard/games`; `/games` redirects to same when flag on.                                                              |
| Users can start solo games                                | ✅     | GamesPage + per-game play pages (e.g. Hangman, Snake, Slots, 2048, Tetris).                                                            |
| Users can invite connections to multiplayer games         | ✅     | `createMultiplayerSessionWithInvite`, connection picker in GamesPage.                                                                  |
| Invitees can accept or decline invitations                | ✅     | `acceptInvitation`, `declineInvitation` in gamesApi; GamesPage pending-invitation UI.                                                  |
| Game sessions persist across refresh and re-entry         | ✅     | Sessions in DB; state in `game_sessions.state_payload`; play pages load by session id.                                                 |
| Turn-based games enforce turn order                       | ✅     | Per-game move APIs and play pages enforce turn; status `waiting_your_move` / `waiting_opponent_move`.                                  |
| Users receive notifications for game events               | ✅     | Notification types: `game_invite`, `game_invite_accepted`, `game_your_turn`, `game_completed`; links to `/dashboard/games` or session. |
| Users can view active and completed games                 | ✅     | GamesPage: waiting on you, waiting on others, active solo, completed.                                                                  |
| System supports both solo and multiplayer games           | ✅     | Game definitions and APIs support solo and multiplayer; multiple play pages for each.                                                  |
| Architecture allows adding games without major redesign   | ✅     | `game_definitions`, `game_sessions`, `game_invitations`, `game_session_participants`, per-game state and move APIs.                    |

---

## 4. Key implementation areas

- **Frontend:** `src/pages/dashboard/GamesPage.tsx`,
  `src/hooks/useGameSessions.ts`, play pages under
  `src/pages/dashboard/*PlayPage.tsx`.
- **API / types:** `src/lib/api/gamesApi.ts`, `src/types/games.ts`.
- **Notifications:** `src/lib/notifications/notificationLinks.ts` (game_invite,
  game_your_turn, game_completed).
- **Nav:** Explore sidebar and Navbar (games section) when `gamesEnabled`; route
  `/games` in `AppRouteTree.tsx`.

---

## 5. QA notes (from Epic)

- Navigate to Games via main nav and via `/games`; both should reach the Games
  surface.
- Start solo games and confirm they launch and persist.
- Invite connections to multiplayer games; confirm accept/decline and session
  creation.
- Confirm turn order in multiplayer; refresh and re-open and confirm state
  persistence.
- Confirm notifications for invites, your turn, and completed games.
