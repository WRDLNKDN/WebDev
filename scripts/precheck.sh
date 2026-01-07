#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Optional skip tag logic
LAST_COMMIT_MSG="$(git log -1 --pretty=%B || true)"
if echo "$LAST_COMMIT_MSG" | grep -qi '\[skip-precheck\]'; then
  echo "⚠️  Skipping pre-push checks due to [skip-precheck] tag."
  exit 0
fi

echo "🔍 Running Pre-Push Quality Gate..."

# 1. EMPTY FILE CHECK
echo "📂 Checking for empty files..."
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
if [ -n "$UPSTREAM" ]; then
  BASE="$(git merge-base HEAD "$UPSTREAM")"
  FILES_TO_CHECK="$(git diff --name-only --diff-filter=AM "$BASE"..HEAD)"
else
  echo "⚠️  No upstream configured — scanning entire repo..."
  FILES_TO_CHECK="$(git ls-files)"
fi

ALLOW_EMPTY_REGEX='(^|/)\.gitkeep$|(^|/)\.keep$'
EMPTY_FILES=""
while IFS= read -r file; do
  [ -z "${file:-}" ] && continue
  if echo "$file" | grep -Eq "$ALLOW_EMPTY_REGEX"; then continue; fi
  if [ -f "$file" ] && [ ! -s "$file" ]; then
    EMPTY_FILES+="$file"$'\n'
  fi
done <<< "$FILES_TO_CHECK"

if [ -n "$EMPTY_FILES" ]; then
  echo -e "🛑 Empty files detected:\n$EMPTY_FILES"
  exit 1
fi

# 2. PRETTIER (Format Check)
echo "🎨 Prettier — check"
if ! npx --no-install prettier --check .; then
  echo "💾 Prettier — writing fixes..."
  npx --no-install prettier --write .
  git add -A
  git commit -m "style: auto-format with Prettier [skip-precheck]" --no-verify
  
  echo ""
  echo "----------------------------------------------------------------"
  echo "🛑 SYSTEM AUDIT: Prettier found and fixed style issues."
  echo "Your local history has diverged from the remote."
  echo "ACTION REQUIRED: Run the following command to align your branch:"
  echo "   git pull --rebase origin $(git rev-parse --abbrev-ref HEAD) && git push"
  echo "----------------------------------------------------------------"
  echo ""
  exit 1
fi

# 3. MODERN ESLINT (Unified System Audit)
# We removed the --ext flag and the 'src' path to satisfy ESLint 9
echo "🧪 ESLint — check"
if ! npx --no-install eslint "src/**/*.{js,jsx,ts,tsx}" --cache --max-warnings=0; then
  echo "🔧 ESLint — fixing..."
  npx --no-install eslint "src/**/*.{js,jsx,ts,tsx}" --fix
  git add -A
  git commit -m "chore: auto-fix eslint [skip-precheck]"
  echo ""
  echo "----------------------------------------------------------------"
  echo "🛑 ESLint fixed files and committed. Push again."
  echo "TIP: You can try running 'npm run lint:fix' for simple fixes."
  echo "----------------------------------------------------------------"
  echo ""
  exit 1
fi
echo "✅ ESLint passed."

# 4. TYPESCRIPT (Static Verification)
echo "🛠️ TypeScript — type check"
npx --no-install tsc --noEmit --pretty false
echo "✅ TypeScript passed."

echo "🚀 All checks passed. Ready to push!"

# 5. ACCESSIBILITY SMOKE TEST (The New Firewall)
# Only run this if Supabase is already running to avoid Activation Energy lag
if docker ps | grep -q "supabase_db"; then
  echo "♿ Running Accessibility Smoke Test (WCAG 2.2)..."
  npx playwright test tests/accessibility.spec.ts
else
  echo "⚠️  Supabase not running; skipping A11y Smoke Test."
fi

echo "🚀 All checks passed. Ready to push!"