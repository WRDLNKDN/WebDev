#!/usr/bin/env bash

set -euo pipefail

project_name="$(basename "$PWD")"
storage_health_url="http://127.0.0.1:54321/storage/v1/bucket"
storage_502_message="Error status 502: An invalid response was received from the upstream server"

run_reset() {
  SUPABASE_DB_ONLY=true npx supabase@latest db reset
}

restart_kong() {
  local kong_container
  kong_container="$(
    docker ps -a \
      --filter "label=com.supabase.cli.project=${project_name}" \
      --filter "name=^/supabase_kong_" \
      --format '{{.Names}}' \
      | head -n 1
  )"

  if [ -z "$kong_container" ]; then
    return 1
  fi

  echo "Supabase reset hit a transient Storage 502 during restart. Restarting Kong..."
  docker restart "$kong_container" >/dev/null
}

wait_for_storage() {
  local code
  local attempt

  for attempt in $(seq 1 20); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$storage_health_url" || true)"
    if [ -n "$code" ] && [ "$code" != "000" ] && [ "$code" != "502" ]; then
      echo "Storage gateway recovered. Reset completed successfully."
      return 0
    fi
    sleep 1
  done

  return 1
}

log_file="$(mktemp)"
cleanup() {
  rm -f "$log_file"
}
trap cleanup EXIT

set +e
run_reset 2>&1 | tee "$log_file"
reset_status=${PIPESTATUS[0]}
set -e

if [ "$reset_status" -eq 0 ]; then
  exit 0
fi

if ! grep -q "$storage_502_message" "$log_file"; then
  exit "$reset_status"
fi

if restart_kong && wait_for_storage; then
  exit 0
fi

cat <<'EOF' >&2
Storage did not recover after the transient reset 502.
Run:
  npx supabase@latest stop
  npx supabase@latest start
EOF

exit "$reset_status"
