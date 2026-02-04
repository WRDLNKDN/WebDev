# 📚 WRDLNKDN Central Documentation

> **Primary Source of Truth:** >
> [WRDLNKDN Home Wiki](https://github.com/WRDLNKDN/WebDev/wiki) > _Please
> consult the Wiki for high-level guides, policies, and roadmap details before
> contributing._

---

## 🚀 Project Overview

## <<<<<<< HEAD

## WRDLNKDN

![WRDLNKDN logo: Square](./assets/square%20logo.png)

![Last Commit](https://img.shields.io/github/last-commit/WRDLNKDN/WebDev)
![License](https://img.shields.io/github/license/WRDLNKDN/WebDev)
![Node Version](https://img.shields.io/badge/node-18+-blue) =======
![WRDLNKDN logo: Square](./assets/square%20logo.png)

![Last Commit](https://img.shields.io/github/last-commit/AprilLorDrake/WRDLNKDN)
![License](https://img.shields.io/github/license/AprilLorDrake/WRDLNKDN)
![Node Version](https://img.shields.io/badge/node-22+-blue)

> > > > > > > main
> > > > > > > ![Made with TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)

**Professional networking, but human.**

<<<<<<< HEAD WRDLNKDN is a modern, accessibility-first professional directory
and platform.  
It explores what professional presence and connection look like when we stop
pretending it has to be polished, performative, or predictable. ======= WRDLNKDN
is a modern, accessibility-first professional directory and platform. It
explores what professional networking looks like when we stop pretending it
isn't weird.

> > > > > > > main

---

## 🌐 Platform Architecture

<<<<<<< HEAD WRDLNKDN consists of: =======

- **Frontend**: React 19 + Vite UI with a WCAG 2.2 AA compliant dark theme.
- **Backend**: API deployed on Vercel handling profiles and moderation.
- **Database/Auth**: Supabase (Local Docker stack for development).
  > > > > > > > main

### 🛠️ Technology Stack

| Category       | Technology  | Purpose                         |
| :------------- | :---------- | :------------------------------ |
| **Framework**  | React 19    | Modern APIs, future-proof DX    |
| **Build Tool** | Vite        | Fast dev server and builds      |
| **Language**   | TypeScript  | Type safety and maintainability |
| **UI**         | Material UI | Accessible component system     |
| **Design**     | WCAG 2.2    | Accessibility-first defaults    |
| **Database**   | Supabase    | Auth, PostgreSQL, and Realtime  |

---

---

## 📐 Non-Functional Requirements (NFRs)

WRDLNKDN is governed by a set of **platform-level non-functional requirements**
that define operational, scalability, security, and portability constraints,
independent of implementation details or vendors.

These constraints apply across **registration, approval, admin moderation, and
directory workflows**, and serve as a baseline for all platform decisions.

- **Source of Truth:**
  [`docs/architecture/platform-nfrs.md`](./docs/architecture/platform-nfrs.md)
- Referenced by architecture, platform, and implementation tickets
- Designed to support future replatforming and external integrations

> Any architectural or infrastructure change **must comply** with the defined
> NFRs.

---

## ⚙️ Getting Started

### 📦 Prerequisites

- **Node.js**: Version 22 (Recommended via `nvm`)
- **Docker**: Required for local Supabase inhabitants
- **Git**: Configured with a GPG/SSH key for **Verified** commits

### 🛠️ Initial Setup

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/WRDLNKDN/WebDev.git](https://github.com/WRDLNKDN/WebDev.git)
   cd WebDev
   ```

````bash

# Install Dependencies

```bash
<<<<<<< HEAD
git clone https://github.com/WRDLNKDN/WebDev.git
cd WebDev
```
=======
npm install
````

## Initialize Local Environment

```bash
# Start the local Supabase containers (Docker must be running)
 npx supabase start

# Copy environment variables
touch .env (or manually copy)
cp .env.example .env
```

## Development Workflow

### 1. Database & Auth (Supabase)

The project inhabits a local Docker stack for data.

- **Start:** `npx supabase start`
- **Stop:** `npx supabase stop`
- **Studio (GUI):** [http://127.0.0.1:54323](http://127.0.0.1:54323)

### 2. Running the UI

```bash
npm run dev
```

The frontend will inhabit [http://localhost:5173](http://localhost:5173) (or
8080 if running via the production Dockerfile).

### 3. Code Quality Checks

We enforce Logic Purity through local hooks:

- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Type-check:** `npm run typecheck`

> Note: Husky pre-commit hooks will automatically perform a System Audit on your
> staged changes.

## 📁 Resource Map

- **Contributing Guide:** [CONTRIBUTING.md](CONTRIBUTING.md) — Workflow, Code
  Style, and PR rules.
- **Contributor Credits:** [CONTRIBUTORS.md](CONTRIBUTORS.md) — The humans
  behind the OS.
- **Project Board:** GitHub Projects

## ♿ Accessibility

Accessibility is a core design constraint, not a retrofit.

- WCAG 2.2 AA contrast compliance.
- Full keyboard navigation and focus indicators.
- Semantic HTML and ARIA inhabitation.

## Contributors

Thanks to everyone who has helped build or improve WRDLNKDN. Generated using
contrib.rocks.

## License

MIT License. Use and modify freely.

> > > > > > > main
