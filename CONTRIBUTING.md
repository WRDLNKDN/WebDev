# Contributing Guide

## Introduction

Welcome! Thank you for considering making a contribution to the project. A
variety of contributions so far have really helped to improve the project, and
yours could too!

## Guidelines

Following these guidelines helps to ensure everyone is using the same process to
help improve the project.

## What Contributions Are Welcome

A variety of contributions are welcome! People have helped in the following
ways:

- Bugs
- Suggested features to improve the project,
- Helped with testing,
- Reviewed and fixed broken PRs,
- Implemented/improved CI/CD pipelines
- Improvements to performance
- Improvements to styling
- Implementing accessibility and keyboard navigation support
- Help with the documentation (this guide itself, the README and the Wiki)

Any help with testing, in particular on Safari browsers, is particularly
appreciated!!

## What Contributions Are Not Needed (Currently)

- We are currently not looking for any more contributions to the UI mock-ups,
  but this may change in the future.
- Contributions that aim to recreate the pixelated, old-school feel of the
  original Minesweeper or many of its clones.  
  We have very carefully chosen modern styling to differentiate our version and
  maintain a consistent, contemporary user experience.

## Ground Rules

Please read the
[Code of Conduct](https://github.com/v-gajjar/Minesweeper/blob/develop/CODE_OF_CONDUCT.md).

## Creating an Issue – To Report Bugs or Suggest Features/Enhancements

Before creating an issue, please first check the
[Kanban board](https://github.com/users/v-gajjar/projects/2) to see whether a
ticket already exists — this helps avoid duplicates and keeps the project
organized.

If you don't find a matching issue, feel free to create one using the
appropriate issue template.  
Please follow the relevant template rather than submitting in an arbitrary
format.

Once created, your ticket will automatically appear in the **“Under
Consideration”** column of the project's Kanban board.

---

## Choosing an Existing Issue

<<<<<<< HEAD
If you'd like to contribute to an existing issue, check the
[Kanban board](https://github.com/users/v-gajjar/projects/2) for tickets in the
**TODO** column that aren’t already assigned.
=======
### 1. The Workflow

- **Fork the repository** and create your branch from `main`.
- **Install Dependencies**: Ensure you are using **Node 22** (via `nvm`) and run
  `npm install`.
- **Open a Pull Request** with a clear description of your changes.
- **Use Issues** for bugs, feature requests, or questions.

### 2. Communication

- **Join Discord** for discussion and coordination:
  [https://discord.gg/RkenxynH](https://discord.gg/RkenxynH)
>>>>>>> main

We’d especially appreciate help on tasks labelled  
[`priority:high`](https://github.com/v-gajjar/Minesweeper/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22priority%3A%20high%22) or  
[`priority:medium`](https://github.com/v-gajjar/Minesweeper/issues?q=is%3Aissue%20state%3Aopen%20label%3Apriority%3Amedium),  
as
these are currently the most impactful for the project.

<<<<<<< HEAD
If you're unsure whether a ticket is available or appropriate to work on, feel
free to comment on the issue to ask!

## Submitting a PR
=======
## 📝 Code Style & Quality

We enforce **Logic Purity** through automated tooling. Please ensure your code
passes our local "System Audits" before pushing:

- **Linting**: Run `npm run lint` to catch errors.
- **Formatting**: Run `npm run format` to align with Prettier rules.
- **Type Safety**: Run `npm run typecheck` to verify TypeScript logic.
- **Commit Messages**: Use clear, descriptive messages. We recommend **Signed
  Commits** (GPG/SSH) for verification.

_Note: This repo uses **Husky**. Pre-commit hooks will automatically block
commits that fail linting or formatting checks._
>>>>>>> main

Before submitting, link your PR to its related issue.  
If one doesn’t exist yet, please create it first — this helps with tracking and
discussion.

<<<<<<< HEAD
**Note:** We all sometimes forget! Creating and linking an issue afterward is
totally fine — thank you for doing it.

### Branching Strategy (Git Flow)
=======
## 🏷️ Labels & Triage

- **Issues and PRs** are labeled for clarity (e.g., `bug`, `feature`,
  `help wanted`).
- **Milestones** track major releases and goals.
- **Code Review**: All contributions require at least one review before merging.
>>>>>>> main

- Please branch off the `develop` branch (not `main`).
- Make sure your local `develop` branch is up to date before branching off.
- PRs should be submitted against the `develop` branch unless otherwise
  discussed.

<<<<<<< HEAD
## Any Concerns or Questions?

Please don't hesitate to reach out!
=======
## 🤝 Onboarding & Agreements

Most casual contributions (typos, small bug fixes) do **not** require formal
onboarding.

However, if you plan to:

- Contribute on an ongoing basis
- Take ownership of a feature
- Incur reimbursable expenses

You must complete onboarding and accept the Contributor Agreement **before
proceeding**.

- **Step 1: Onboarding Guide**
  [https://github.com/WRDLNKDN/WebDev/wiki/Contributor-Onboarding](https://github.com/WRDLNKDN/WebDev/wiki/Contributor-Onboarding)

- **Step 2: Legal Source of Truth**
  [https://github.com/WRDLNKDN/Agreements/wiki/Contributor-Agreement](https://github.com/WRDLNKDN/Agreements/wiki/Contributor-Agreement)

_This repository does not duplicate agreement text; the wiki is the single
source of truth._

---

## 🙏 Credits

See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for a list of people who have helped
make this project possible.

---

**Thank you for helping make WRDLNKDN awesome!**
>>>>>>> main
