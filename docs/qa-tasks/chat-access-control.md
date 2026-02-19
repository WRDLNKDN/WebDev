Title: QA: Chat Surface – Access Control and Session Integrity

Type: Task

Parent Epic: EPIC: MVP Chat (Web-First, Matrix Synapse, OIDC SSO, No Federation)
#227 Environment: UAT (webdev-uat.vercel.app)

Priority: P0 Size: M Points: 8 Estimated Time: 16 hours

---

## Goal

Validate that the Chat surface:

- Is accessible only to authenticated users
- Does not expose rooms to unauthorized users
- Maintains session state across refresh
- Does not create redirect loops
- Does not leak presence or message data

---

## Preconditions

1. Two authenticated accounts exist:
   - Account A
   - Account B
2. At least one 1:1 chat exists between A and B.
3. At least one group chat exists (if implemented).
4. Signed-out browser session available.

---

## Use Case 10A: Signed-Out Access Attempt

Steps:

1. Sign out.
2. Navigate directly to `/chat` or equivalent chat route.

Expected Behavior:

- Redirect to `/join`.
- No chat UI renders.
- No partial message content flashes.
- No Matrix session established.

---

## Use Case 10B: Authenticated Access

Steps:

1. Log in as Account A.
2. Navigate to Chat surface.

Expected Behavior:

- Chat loads successfully.
- Only authorized rooms appear.
- No rooms from other users visible.
- No console auth errors.

---

## Use Case 10C: Room Isolation

Steps:

1. As Account A, open 1:1 chat with Account B.
2. Attempt to manipulate route to access:
   - Another room ID not owned
   - Random room ID

Expected Behavior:

- Access denied OR graceful redirect.
- No unauthorized message history visible.
- No blank crash state.

---

## Use Case 10D: Session Persistence

Steps:

1. While in Chat, hard refresh.
2. Observe behavior.

Expected Behavior:

- Remains authenticated.
- Returns to Chat surface.
- Does not redirect to `/join`.
- No infinite loading spinner.
- Messages rehydrate correctly.

---

## Use Case 10E: Multi-Tab Behavior

Steps:

1. Open Chat in two tabs.
2. Send message from one tab.

Expected Behavior:

- Message appears in second tab.
- No duplicate message creation.
- No auth desync.

---

## Use Case 10F: Sign Out From Chat

Steps:

1. While in Chat, click `Sign Out`.
2. Observe behavior.

Expected Behavior:

- Redirect to `/join`.
- Chat surface inaccessible.
- No residual Matrix session active.
- No background presence continues.

---

## Use Case 10G: Attachment Limit Enforcement (If Implemented)

Steps:

1. Attempt to upload file > 6MB.
2. Attempt to upload allowed file type.

Expected Behavior:

- Oversized file rejected.
- Error shown clearly.
- Allowed file uploads successfully.
- No client crash.

---

## Evidence to Capture

- Screenshots of redirect behavior
- Room isolation behavior
- Session persistence after refresh
- Console logs if errors appear

---

## Severity

High:

- Unauthorized room access
- Message leakage
- Redirect loop
- Session desync

Medium:

- Presence glitch
- Multi-tab duplication

Low:

- Minor UI inconsistency

---

## Pass Criteria

- Chat is protected by auth.
- Room access is strictly isolated.
- Session persists across refresh.
- No message leakage.
- No redirect instability.
