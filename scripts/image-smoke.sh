#!/usr/bin/env bash
# Smoke test for the API image, run by CI and by hand:
#   scripts/image-smoke.sh <image> <postgres url> [port]
# The database must be empty or migrated. The image's release command migrates it, then the service must
# answer /healthz and stop with exit code 0 on SIGTERM. Containers use the host network, so the URL and port are the host's.
set -euo pipefail

image=$1
url=$2
port=${3:-3000}
name=sk-api-smoke-$$
env=(-e "DATABASE_URL=$url" -e "DATABASE_URL_UNPOOLED=$url")

trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

echo '== production dependencies only, not root'
docker run --rm "$image" sh -ec '
  test "$(id -u)" != 0
  # Fails when the folder is missing, and hono must be listed, so the dev check below cannot pass on an empty list.
  packages=$(ls node_modules/.pnpm)
  echo "$packages" | grep -q "^hono@" || { echo "hono is not in node_modules/.pnpm"; exit 1; }
  for dev in tsx typescript vitest drizzle-kit eslint; do
    ! echo "$packages" | grep -q "^$dev@" || { echo "dev dependency in the image: $dev"; exit 1; }
  done
  test -z "$(find /app -name ".env*" -not -path "*/node_modules/*")"
  test -f packages/api-contract/dist/src/index.js
  test -f packages/i18n/dist/src/en.js
  echo "uid $(id -u), no dev dependency, no env file"'

echo '== release command'
docker run --rm --network host "${env[@]}" "$image" node api/dist/platform/db/migrate.js

echo '== service'
docker run -d --name "$name" --network host "${env[@]}" -e HOST=127.0.0.1 -e "PORT=$port" "$image" >/dev/null
body=
for _ in $(seq 60); do
  body=$(curl -fsS "http://127.0.0.1:$port/healthz" 2>/dev/null) && break
  sleep 0.5
done
echo "GET /healthz -> $body"
if [ "$body" != '{"status":"ok"}' ]; then
  docker logs "$name"
  exit 1
fi

docker stop -t 15 "$name" >/dev/null
code=$(docker inspect -f '{{.State.ExitCode}}' "$name")
docker logs "$name"
echo "exit code after SIGTERM: $code"
test "$code" = 0
