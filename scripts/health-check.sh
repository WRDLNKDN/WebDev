#!/usr/bin/env bash

echo "🩺 Starting System Health Check..."

# Function to wait for a URL to be reachable
wait_for_url() {
  local url=$1
  local name=$2
  local timeout=30
  local count=0

  echo "⏳ Waiting for $name at $url..."
  until $(curl -output /dev/null --silent --head --fail "$url"); do
    if [ $count -eq $timeout ]; then
      echo "❌ $name failed to start within $timeout seconds."
      exit 1
    fi
    printf '.'
    sleep 1
    ((count++))
  done
  echo -e "\n✅ $name is LIVE."
}

# System Audit: Check all three nodes of the Human OS
wait_for_url "http://localhost:54323" "Supabase Studio"
wait_for_url "http://localhost:5173" "Vite Frontend"

echo "🚀 All systems nominal. Launching cockpit..."
# Now we trigger the actual open command
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  start http://localhost:5173 && start http://localhost:54323
else
  open http://localhost:5173 && open http://localhost:54323
fi