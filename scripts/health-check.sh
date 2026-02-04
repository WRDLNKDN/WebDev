#!/usr/bin/env bash
set -euo pipefail

echo "🩺 [SYSTEM AUDIT]: Initializing Health Check..."
echo "----------------------------------------------------------------"

# Function to wait for a URL to be reachable
wait_for_url() {
  local url=$1
  local name=$2
  local timeout=30
  local count=0

  echo "⏳ [WAITING]: $name at $url..."
  
  # Logic Fix: Removed the $() subshell. 
  # We also fixed the '-output' typo to '--output'.
  until curl --output /dev/null --silent --head --fail "$url"; do
    if [ $count -eq $timeout ]; then
      echo -e "\n🛑 [SYSTEM FAULT]: $name failed to respond. Activation Energy too high!"
      exit 1
    fi
    printf '.'
    sleep 1
    ((count++))
  done
  echo -e "\n✅ [SUCCESS]: $name is active and inhabited."
}

# 1. Physical Layer Check: Supabase
wait_for_url "http://localhost:54323" "Supabase Studio"

# 2. Logic Layer Check: Vite
wait_for_url "http://localhost:5173" "Vite Frontend"

echo "----------------------------------------------------------------"
echo "🚀 [HEALTH CHECK COMPLETE]: Launching the cockpit..."

# 3. Cross-Platform Launch (The WSL 2 Special)
if grep -qi microsoft /proc/version; then
  # We are in WSL: Use Windows Explorer to bridge the OS gap
  explorer.exe "http://localhost:5173"
  explorer.exe "http://localhost:54323"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  # We are in Git Bash/Windows native
  start http://localhost:5173 && start http://localhost:54323
else
  # We are in macOS or standard Linux
  open http://localhost:5173 && open http://localhost:54323
fi