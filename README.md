# 📚 Resources

- [Project Wiki](https://github.com/WRDLNKDN/WebDev/wiki) — Full documentation, guides, and policies
- [Contributing Guide](CONTRIBUTING.md) — How to contribute, code style, and PR process
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

1. Install dependencies

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

1. Environment configuration

Each service uses environment variables.

- Copy the example env file in each directory:

```bash
cp .env.example .env
```

- Update values as needed for local development

Environment variables are documented in each subfolder’s README.

---

## ▶️ Running Locally

Frontend (UI)

```bash
cd frontend
npm run dev
```

You should see output similar to:

```bash
VITE vX.X.X  ready in XXX ms
➜  Local:   http://localhost:5173/
```

Backend (API)

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

```js
<details>
<summary>📁 Click to expand file structure</summary>
```

```txt
.
├── .github
│   └── workflows
│       └── WebDev.yml
├── .husky
│   ├── pre-commit
│   └── pre-push
├── assets
│   ├── banner.png
│   ├── logo.png
│   └── nyan-adventure.png
├── backend
│   ├── api-hello.js
│   └── README.md
├── frontend
│   └── README.md
├── public
│   ├── assets
│   │   └── gallerybanner.png
│   └── vite.svg
├── scripts
│   └── precheck.sh
├── src
│   ├── assets
│   │   └── react.svg
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── theme.ts
├── commit-and-push.bat
├── CONTRIBUTORS.md
├── eslint.config.cjs
├── index.html
├── INTEGRATION.md
├── LICENSE
├── package-lock.json
├── package.json
├── PROJECT_BOARD.md
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
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

🔗 [WeirdLinkedIn Project](https://github.com/users/AprilLorDrake/projects/3)

---

## Contributors

Thanks to everyone who has helped build or improve WeirdLinkedIn.

[![Contributors](https://contrib.rocks/image?repo=AprilLorDrake/WeirdLinkedIn)](https://contrib.rocks/image?repo=AprilLorDrake/WeirdLinkedIn)

Generated using [contrib.rocks](https://contrib.rocks)

### Contributing

Interested in contributing?

- 📄 [CONTRIBUTORS.md](CONTRIBUTORS.md)
- 🐛 Open an issue for bugs or feature requests
- 🔀 Submit a pull request

All contributions are welcome.

---

## License

MIT License. Use and modify freely.
