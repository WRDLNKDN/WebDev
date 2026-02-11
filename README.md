# 📚 WRDLNKDN Central Documentation

> **Primary Source of Truth:**  
> [WRDLNKDN Home Wiki](https://github.com/WRDLNKDN/WebDev/wiki)  
> _Please consult the Wiki for high-level guides, policies, and roadmap details
> before contributing._

---

## 🚀 Project Overview

## WRDLNKDN

![WRDLNKDN logo: Square](./assets/square%20logo.png)

![Last Commit](https://img.shields.io/github/last-commit/WRDLNKDN/WebDev)
![License](https://img.shields.io/github/license/WRDLNKDN/WebDev)
![Node Version](https://img.shields.io/badge/node-22+-blue)
![Made with TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)

**Professional networking, but human.**

WRDLNKDN is a modern, accessibility-first professional feed and platform.  
It explores what professional presence and connection look like when we stop
pretending it has to be polished, performative, or predictable.

---

## 🌐 Platform Architecture

WRDLNKDN consists of:

- **Frontend**: React 19 + Vite SPA with WCAG 2.2 AA–compliant theming
- **Backend**: API deployed on Vercel handling profiles and moderation
- **Database/Auth**: Supabase (local Docker stack for development)

---

### 🛠️ Technology Stack

| Category       | Technology  | Purpose                         |
| -------------- | ----------- | ------------------------------- |
| **Framework**  | React 19    | Modern APIs, future-proof DX    |
| **Build Tool** | Vite        | Fast dev server and builds      |
| **Language**   | TypeScript  | Type safety and maintainability |
| **UI**         | Material UI | Accessible component system     |
| **Design**     | WCAG 2.2    | Accessibility-first defaults    |
| **Database**   | Supabase    | Auth, PostgreSQL, and Realtime  |

---

## 📐 Non-Functional Requirements (NFRs)

WRDLNKDN is governed by a set of **platform-level non-functional requirements**
that define operational, scalability, security, and portability constraints.

These apply across **registration, approval, admin moderation, and feed
workflows**, independent of specific implementation details.

- **Source of Truth:**  
  [`docs/architecture/platform-nfrs.md`](./docs/architecture/platform-nfrs.md)
- Referenced by architecture, platform, and implementation tickets
- Designed to support future replatforming and external integrations

> Any architectural or infrastructure change **must comply** with the defined
> NFRs.

---

## 📖 Documentation

- **Docs index:** [docs/README.md](./docs/README.md)
- **Information architecture (routes, nav, access):**
  [docs/architecture/information-architecture.md](./docs/architecture/information-architecture.md)
- **Auth & password (user and admin):**
  [docs/auth-requirements.md](./docs/auth-requirements.md)
- **Weirdling architecture (visual rules & contributing):**
  [docs/architecture/weirdling-architecture-guide.md](./docs/architecture/weirdling-architecture-guide.md)

---

## ⚙️ Getting Started

### 📦 Prerequisites

- **Node.js**: Version 22 (recommended via `nvm`)
- **Docker**: Required for local Supabase
- **Git**: Configured with SSH or GPG for verified commits

---

### 🛠️ Initial Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/WRDLNKDN/WebDev.git
   cd WebDev
   ```

2. **Install and run (dev):**

   ```bash
   npm install
   npx supabase start   # apply migrations (includes Weirdling tables)
   npm run dev          # Vite + API proxy; open http://localhost:5173
   ```

3. **Try the Weirdling generator:**
   - Sign in (Create account or Sign in with Google/Microsoft).
   - In the nav, click **Create My Weirdling** (or go to `/weirdling/create`).
   - Complete the 4-step wizard (name, role & interests, tone & boundaries,
     optional bio).
   - Click **Generate** → preview → **Save**, **Regenerate**, **Edit**, or
     **Cancel**.
   - Backend uses a mock AI adapter (no API key); see
     [Epic: Weirdling Generator](./docs/architecture/epic-weirdling-generator.md)
     to plug in a real provider.
