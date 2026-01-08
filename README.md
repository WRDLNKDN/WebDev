# 📚 Resources

- [Project Wiki](https://github.com/WRDLNKDN/WebDev/wiki) — Full documentation, guides, and policies

**Contributor & Contributing Files:**

- [CONTRIBUTING.md](https://github.com/WRDLNKDN/WebDev/blob/main/CONTRIBUTING.md) — How to contribute, code style, PR process, and workflow rules
- [CONTRIBUTORS.md](https://github.com/WRDLNKDN/WebDev/blob/main/CONTRIBUTORS.md) — Credits and thanks to project contributors

# WeirdLinkedIn

![WeirdLinkedIn logo: Square](./assets/square%20logo.png)

![Last Commit](https://img.shields.io/github/last-commit/AprilLorDrake/WeirdLinkedIn)
![License](https://img.shields.io/github/license/AprilLorDrake/WeirdLinkedIn)
![Node Version](https://img.shields.io/badge/node-18+-blue)
![Made with TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)

**Professional networking, but human.**

WeirdLinkedIn is a modern, accessibility-first professional directory and platform.  
It explores what professional networking looks like when we stop pretending it isn't weird.

---

## 🌐 Platform Overview

WeirdLinkedIn consists of:

- **Frontend**

  - React 19 + Vite UI
  - Designed for GoDaddy website integration
  - WCAG 2.2 AA compliant dark theme

- **Backend**
  - API deployed on Vercel
  - Handles profiles, moderation, and directory access
  - Built to scale beyond initial launch without redesign

---

## 🛠️ Technology Stack

| Category   | Technology   | Purpose                         |
| ---------- | ------------ | ------------------------------- |
| Framework  | React 19     | Modern APIs, future-proof DX    |
| Build Tool | Vite         | Fast dev server and builds      |
| Language   | TypeScript   | Type safety and maintainability |
| UI         | Material UI  | Accessible component system     |
| Design     | WCAG 2.2     | Accessibility-first defaults    |
| Icons      | Font Awesome | Consistent SVG iconography      |

---

## ⚙️ Code Quality & Tooling

- **ESLint** – Code correctness and best practices
- **Prettier** – Canonical formatting
- **Husky** – Local enforcement via Git hooks
- **TypeScript** – Static analysis and safety

Checks run locally before code reaches CI.

---

## 🚀 Getting Started

This project is split into a frontend (React + Vite) and a backend API.
Each can be run independently for development.

---

## 📦 Requirements

- Node.js 18 or newer
- npm (comes with Node)
- A GitHub account (for issues and project board access)

Optional but recommended:

- VS Code
- Prettier + ESLint extensions

---

## ⚙️ Setup

1. Clone the repository

```bash
git clone https://github.com/<your-org-or-user>/WeirdLinkedIn.git
cd WeirdLinkedIn
```

2. Install dependencies

Install Docker

```bash
cd frontend
npm install

cd ../backend
npm install

# Initialize the Supabase configuration (if not already present)
npx supabase init

# Start the local Docker containers
npx supabase start
```

3. Environment configuration

Each service uses environment variables.

- Copy the example env file in each directory:

```bash
cp .env.example .env
```

- Update values as needed for local development

Environment variables are documented in each subfolder’s README.

---

## ▶️ Running Locally

### Supabase (Database + Auth)

Supabase is required for local development. It runs via Docker and provides:

- Postgres database
- Auth (JWTs, RLS context)
- REST and GraphQL APIs

Start Supabase from the project root:

```bash
npx supabase start
```

After startup, you should see output similar to:

```text
Studio:        http://127.0.0.1:54323
API URL:       http://127.0.0.1:54322
DB URL:        postgresql://postgres:postgres@127.0.0.1:54328/postgres
```

These values are used by:

- `src/lib/supabaseClient.ts`
- `.env`
- `.env.test` (for RLS/unit tests)

Stop Supabase when finished:

```bash
npx supabase stop
```

---

### Frontend (UI)

```bash
cd frontend
npm run dev
```

You should see output similar to:

```bash
VITE vX.X.X  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

### Backend (API)

```bash
cd backend
npm run dev
```

The API will start on the configured local port.

---

## 🧪 Code Quality Checks

From either directory (or root if configured):

- Format code

```bash
npm run format
```

- Run Linting

```bash
npm run lint
```

- Type-check

```bash
npm run typecheck
```

Pre-commit hooks will also enforce these checks automatically via Husky.

---

## 📁 Project Structure

<details>
<summary>📁 Click to expand file structure</summary>

```

.
├── .github
│   └── workflows
│       ├── renovate-lockfile-gate.yml
│       ├── renovate-lockfile-pr.yml
│       └── WebDev.yml
├── .husky
│   ├── pre-commit
│   └── pre-push
├── assets
│   ├── banner.png
│   ├── logo.png
│   ├── nyan-adventure.png
│   └── square logo.png
├── backend
│   ├── README.md
│   └── server.ts
├── frontend
│   └── README.md
├── public
│   ├── assets
│   │   └── gallerybanner.png
│   └── vite.svg
├── scripts
│   └── precheck.sh
├── src
│   ├── admin
│   │   ├── adminApi.ts
│   │   ├── AdminApp.tsx
│   │   ├── AdminModerationPage.tsx
│   │   └── ProfileDetailDialog.tsx
│   ├── assets
│   │   └── react.svg
│   ├── components
│   │   ├── BulkActionsBar.tsx
│   │   ├── ProfileTable.tsx
│   │   └── StatusBadge.tsx
│   ├── hooks
│   │   └── useAdminProfiles.ts
│   ├── lib
│   │   └── supabaseClient.ts
│   ├── pages
│   │   ├── ApprovedProfiles.tsx
│   │   ├── Directory.tsx
│   │   ├── Home.tsx
│   │   ├── PendingProfiles.tsx
│   │   ├── ProfileReview.tsx
│   │   └── Register.tsx
│   ├── types
│   │   └── types.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── theme.ts
├── supabase
│   ├── .branches
│   │   └── _current_branch
│   ├── .temp
│   │   └── cli-latest
│   ├── migrations
│   │   ├── 20260102152500_profiles_table.sql
│   │   ├── 20260102152505_profiles_rls.sql
│   │   └── 20260105114500_profiles_status_trigger_fix.sql
│   ├── seeds
│   │   └── 001_dev_seed.sql
│   ├── tests
│   │   └── rls
│   │       ├── admin-visibility.test.ts
│   │       └── profiles.rls.test.ts
│   ├── .gitignore
│   ├── config.toml
│   ├── README.md
│   └── seed.sql
├── tests
│   └── home.spec.ts
├── .dockerignore
├── .editorconfig
├── .env.example
├── .env.local
├── .eslintcache
├── .gitattributes
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc.yml
├── commit-and-push.bat
├── CONTRIBUTING.md
├── CONTRIBUTORS.md
├── docker-compose.yml
├── Dockerfile
├── eslint.config.cjs
├── index.html
├── INTEGRATION.md
├── LICENSE
├── nginx.conf
├── package-lock.json
├── package.json
├── playwright.config.ts
├── PROJECT_BOARD.md
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
└── WIKI_HOME.md

```

</details>

---

## ♿ Accessibility

Accessibility is a core design constraint, not a retrofit.

- WCAG 2.2 AA contrast
- Keyboard navigation
- Focus indicators
- Semantic HTML

---

## 📌 Project Board

🔗 https://github.com/users/AprilLorDrake/projects/3

---

## Contributors

Thanks to everyone who has helped build or improve WeirdLinkedIn.

![Contributors](https://contrib.rocks/image?repo=WRDLNKDN/WebDev&anon=1&max=100&columns=10&v=2)

Generated using [contrib.rocks](https://contrib.rocks)

---

## License

MIT License. Use and modify freely.
