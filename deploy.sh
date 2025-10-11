#!/bin/bash
# Quick deployment script for VPS

set -e

echo "🚀 Deploying Sora2 Platform..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Pulling latest code...${NC}"
git pull

echo -e "${YELLOW}Step 2: Checking environment...${NC}"
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  Please edit backend/.env and add your OPENAI_API_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Building containers...${NC}"
docker-compose build

echo -e "${YELLOW}Step 4: Stopping old containers...${NC}"
docker-compose down

echo -e "${YELLOW}Step 5: Starting new containers...${NC}"
docker-compose up -d

echo -e "${YELLOW}Step 6: Waiting for services to be healthy...${NC}"
sleep 5

echo -e "${YELLOW}Step 7: Checking status...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3000"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop:      docker-compose down"
echo ""

