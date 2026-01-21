# 📚 WRDLNKDN Central Documentation
>
> **Primary Source of Truth:** [WRDLNKDN Home Wiki](https://github.com/WRDLNKDN/WebDev/wiki)
> *Please consult the Wiki for high-level guides, policies, and roadmap details before contributing.*

---

## 🚀 Project Overview

![WRDLNKDN logo: Square](./assets/square%20logo.png)

![Last Commit](https://img.shields.io/github/last-commit/AprilLorDrake/WRDLNKDN)
![License](https://img.shields.io/github/license/AprilLorDrake/WRDLNKDN)
![Node Version](https://img.shields.io/badge/node-22+-blue)
![Made with TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)

**Professional networking, but human.**

WRDLNKDN is a modern, accessibility-first professional directory and platform. It explores what professional networking looks like when we stop pretending it isn't weird.

---

## 🌐 Platform Architecture

- **Frontend**: React 19 + Vite UI with a WCAG 2.2 AA compliant dark theme.
- **Backend**: API deployed on Vercel handling profiles and moderation.
- **Database/Auth**: Supabase (Local Docker stack for development).

### 🛠️ Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 19 | Modern APIs, future-proof DX |
| **Build Tool** | Vite | Fast dev server and builds |
| **Language** | TypeScript | Type safety and maintainability |
| **UI** | Material UI | Accessible component system |
| **Design** | WCAG 2.2 | Accessibility-first defaults |
| **Database** | Supabase | Auth, PostgreSQL, and Realtime |

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
