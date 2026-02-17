# Personalized Weirdling Generator (AI API Backend, MVP Models)

[← Docs index](../README.md)

**Type:** Epic (can be split into backend + frontend stories)

**MVP data models (source of truth):**  
[WRDLNKDN MVP Models (Google Drive)](https://drive.google.com/drive/folders/1Wf6SklBXkuTUKKsH_hH2GaNCgYohfqjt?usp=drive_link)

---

## 1. Goal

Enable a signed-in user to generate a **Personalized Weirdling** (structured
profile + generated assets) using an AI API–based backend, while strictly
conforming to the WRDLNKDN MVP data models.

---

## 2. User Story

As a Weirdling, I want to create a personalized Weirdling profile using guided
inputs so that I can get a consistent, platform-native identity package (name,
vibe, traits, tagline, and optional visuals) that matches WRDLNKDN’s MVP data
model and can be reused across the site.

---

## 3. Scope

- Guided input form (minimal fields) that maps 1:1 to MVP model fields
- Backend orchestration that calls an AI API to generate structured outputs
- Persisted Weirdling entity and related artifacts according to MVP models
- “Regenerate” and “Edit” flows that preserve history and attribution
- Safety and abuse protections suitable for public signup funnel

---

## 4. Non-Goals

- No public marketplace for Weirdlings in this iteration
- No deep social graph integration beyond saving to the user profile
- No complex image editing suite (only generation + storage + display)

---

## 5. Key Requirements

### 5.1 Conform to MVP Models

- No new fields added to persistent storage without updating the MVP model
  source of truth
- API responses must match the MVP model schema exactly

### 5.2 AI API–Based Backend

- Provider-agnostic design (adapter pattern) so we can swap vendors
- JSON structured output required (no freeform blobs persisted)

### 5.3 Deterministic Persistence

- Raw AI response stored separately from normalized model fields (if MVP models
  allow; otherwise store minimal audit metadata)
- Track generation version, prompt version, model name, and timestamps

---

## 6. Proposed UX Flow

1. User clicks “Create My Weirdling”
2. User completes a short wizard (3–7 questions)
3. Backend generates structured output
4. UI shows preview with “Save”, “Regenerate”, “Edit”, “Cancel”
5. On Save, Weirdling is stored and becomes the user’s active persona

---

## 7. Wizard Inputs (Suggested, Map to MVP Models)

- Display name or handle preference
- Role vibe (e.g. Builder, Chaos Coordinator, Wizard, Spreadsheet Necromancer)
- Industry or interests (tags)
- Tone slider (serious to absurd)
- Boundaries (things to avoid in generated content)
- Optional: short bio seed text
- Optional: image preference toggle (if MVP includes avatar assets)

---

## 8. Backend Design Notes

### 8.1 Endpoints (Example)

- `POST /api/weirdling/generate`
- `POST /api/weirdling/save`
- `POST /api/weirdling/regenerate`
- `GET /api/weirdling/me`

### 8.2 Generation Pattern

- Create `GenerationJob` record (status: queued, running, complete, failed)
- Call AI Provider via adapter
- Validate response against MVP schema
- Persist normalized model entity
- Return preview payload to client

### 8.3 AI Provider Adapter Requirements

- Input prompt builder with versioning
- Structured JSON mode
- Retry policy with backoff
- Cost controls (max tokens, timeouts)

### 8.4 Validation

- Strict schema validation (reject and fail job if mismatched)
- Normalize strings, trim lengths, enforce enums if any exist in MVP

### 8.5 Storage

- Store Weirdling core entity per MVP model
- Store assets (if any) per MVP asset model
- Store audit metadata per MVP logging model (if present)

---

## 9. Acceptance Criteria

- A user can generate a Weirdling preview that includes all required MVP model
  fields populated.
- Saving persists the Weirdling in the database exactly matching MVP model
  schema (field names, types, requireds).
- Regenerate produces a new version while preserving a history reference (if MVP
  supports versions) or at minimum an audit trail.
- The system rejects and logs any AI response that does not validate against the
  MVP schema.
- API adapter supports swapping AI vendors without changing controller logic.
- Rate limits and abuse controls exist (per-user and per-IP) with friendly UI
  errors.
- Prompt version and model version are recorded for each generation.
- Unit tests cover schema validation, adapter behavior, and persistence mapping.
- Basic UI shows: Create, Preview, Save, Regenerate, Edit fields, Cancel.
- No PII is required for generation beyond the wizard inputs.

---

## 10. Edge Cases

- User closes browser mid-generation: job can be resumed or safely retried
- AI returns partial JSON or invalid schema: job fails gracefully with retry
  option
- User requests disallowed content: system refuses and prompts to revise inputs
- Duplicate Weirdling creation attempts: idempotency key prevents duplicates

---

## 11. Security and Compliance

- Do not send secrets or internal identifiers to the AI provider
- Avoid sending user email, real name, or sensitive content unless explicitly
  needed
- Store only what MVP models allow; otherwise store minimal metadata
- Add abuse mitigation: profanity filters, prompt injection guardrails,
  moderation layer if needed

---

## 12. Observability

- Log job status transitions
- Track latency, failure rates, validation failures, and vendor errors
- Emit metrics for cost per generation and total generations per day

---

## 13. Tasks (Implementation Order)

### 13.1 Model Mapping

- Review MVP models in Drive and list the exact required fields for Weirdling
  and related entities
- Define JSON schema validators aligned to MVP models

### 13.2 Backend

- Create AI Provider adapter interface + first implementation
- Implement generation job workflow
- Implement endpoints: generate, save, regenerate, get current
- Add schema validation and error handling
- Add rate limiting and abuse controls

### 13.3 Frontend

- Build wizard UI and validation
- Build preview screen with Save, Regenerate, Edit, Cancel

---

## 14. Definition of Done

- User can complete wizard, see preview, and save a Weirdling that conforms to
  MVP schema
- Regenerate and Edit flows work with history/audit
- Schema validation and adapter are tested
- Rate limits and abuse controls are in place
- Prompt/model versioning and observability are implemented
