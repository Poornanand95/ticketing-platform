#!/bin/bash

set -e

echo "🚀 Starting Ticketing Platform..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${YELLOW}⚠️  Please update .env with your configuration before continuing${NC}"
  echo -e "${YELLOW}⚠️  At minimum, update JWT_SECRET and JWT_REFRESH_SECRET${NC}"
  read -p "Press enter to continue after updating .env..."
fi

# Start infrastructure
echo -e "${GREEN}📦 Starting infrastructure (PostgreSQL, Redis, Kafka, MinIO)...${NC}"
cd infra/compose
docker-compose up -d
cd ../..

# Wait for services to be ready
echo -e "${GREEN}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Install dependencies
echo -e "${GREEN}📥 Installing dependencies...${NC}"
pnpm install

# Run database migrations
echo -e "${GREEN}🗄️  Running database migrations...${NC}"
cd libs/db
pnpm db:push
cd ../..

# Seed default roles
echo -e "${GREEN}🌱 Seeding default roles...${NC}"
cd apps/auth-service
pnpm seed
cd ../..

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To start services, run:"
echo "  pnpm --filter @ticketing/api-gateway dev"
echo "  pnpm --filter @ticketing/auth-service dev"
echo "  pnpm --filter @ticketing/ticket-service dev"
echo "  pnpm --filter @ticketing/notification-service dev"
echo "  pnpm --filter @ticketing/automation-service dev"
echo "  pnpm --filter @ticketing/reporting-service dev"
echo ""
echo "Or use the start-all script: ./scripts/start-all-services.sh"









