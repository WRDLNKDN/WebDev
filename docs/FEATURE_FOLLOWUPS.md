# Feature follow-ups

[← Docs index](./README.md)

Planned or promised follow-up features that are not yet implemented. Referenced
from UI copy (e.g. confirmation dialogs) or acceptance criteria.

## Unblock in Settings

- **Source:** Block confirmation dialog (Directory → Discover Members, and Chat)
  says: “You can unblock later in Settings.”
- **Current state:** Blocking is implemented (insert into `chat_blocks`;
  Directory removes blocked member from results). There is no Settings UI to
  list or unblock members.
- **Follow-up:** Add a “Blocked members” (or similar) section under Dashboard →
  Settings where the member can see blocked users and remove a block (delete
  from `chat_blocks`). Ensure RLS and API allow the blocker to delete their own
  block rows.
- **Surfaces:** `SettingsLayout` has Notifications and Privacy; add a new
  Settings sub-route and page for blocked members / unblock management.
