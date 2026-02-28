#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping all services...${NC}"

# Kill processes by the npm run commands used in start.sh
PATTERNS=(
  "start:gateway:dev"
  "start:auth:dev"
  "start:questions:dev"
  "start:monitor:dev"
  "start:exam:dev"
  "electron/src/main"
  "vite"
)

for pattern in "${PATTERNS[@]}"; do
  pids=$(pgrep -f "$pattern" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}Stopping: $pattern${NC}"
    kill $pids 2>/dev/null
  fi
done

# Also kill any node processes from the microservices or electron directories
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
pgrep -f "node.*$ROOT_DIR" | xargs kill 2>/dev/null

sleep 1

# Force-kill anything that didn't stop gracefully
for pattern in "${PATTERNS[@]}"; do
  pids=$(pgrep -f "$pattern" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo -e "${RED}Force-killing: $pattern${NC}"
    kill -9 $pids 2>/dev/null
  fi
done

echo -e "${GREEN}All services stopped.${NC}"
