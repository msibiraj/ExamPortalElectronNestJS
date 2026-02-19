#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BE_DIR="$ROOT_DIR/microservices"
FE_DIR="$ROOT_DIR/electron"

echo -e "${GREEN}Starting all services...${NC}"

# Start backend microservices
echo -e "${YELLOW}Starting API Gateway...${NC}"
cd "$BE_DIR" && npm run start:gateway:dev &

echo -e "${YELLOW}Starting Auth Service...${NC}"
cd "$BE_DIR" && npm run start:auth:dev &

echo -e "${YELLOW}Starting Question Service...${NC}"
cd "$BE_DIR" && npm run start:questions:dev &

echo -e "${YELLOW}Starting Monitor Service...${NC}"
cd "$BE_DIR" && npm run start:monitor:dev &

echo -e "${YELLOW}Starting Exam Service...${NC}"
cd "$BE_DIR" && npm run start:exam:dev &

# Start frontend
echo -e "${YELLOW}Starting Frontend (Electron + Vite)...${NC}"
cd "$FE_DIR" && npm run dev &

echo -e "${GREEN}All services started. Press Ctrl+C to stop all.${NC}"

# Wait for all background jobs and handle Ctrl+C
trap 'echo -e "${RED}Stopping all services...${NC}"; kill $(jobs -p) 2>/dev/null; exit 0' INT TERM
wait
