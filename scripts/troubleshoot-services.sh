#!/bin/bash

# Troubleshooting script for service startup issues

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 Troubleshooting Service Issues..."
echo ""

# Check infrastructure
echo "1️⃣ Checking Infrastructure:"
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL is NOT running${NC}"
    echo -e "${YELLOW}   Fix: cd infra/compose && docker-compose up -d postgres${NC}"
fi

if lsof -Pi :6379 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is NOT running${NC}"
    echo -e "${YELLOW}   Fix: cd infra/compose && docker-compose up -d redis${NC}"
fi

if lsof -Pi :9092 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Kafka is running${NC}"
else
    echo -e "${RED}❌ Kafka is NOT running${NC}"
    echo -e "${YELLOW}   Fix: cd infra/compose && docker-compose up -d kafka zookeeper${NC}"
fi

echo ""

# Check if services are already running
echo "2️⃣ Checking for running services:"
for port in 3000 3001 3002 3003 3004 3005; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        echo -e "${YELLOW}   You may need to stop existing services first${NC}"
    fi
done

echo ""

# Check for log files
echo "3️⃣ Checking for service logs:"
if [ -d "logs" ]; then
    echo -e "${GREEN}✅ Logs directory exists${NC}"
    for log in api-gateway.log auth-service.log ticket-service.log automation-service.log; do
        if [ -f "logs/$log" ]; then
            echo -e "${YELLOW}   Found: logs/$log${NC}"
            echo -e "${YELLOW}   Last 5 lines:${NC}"
            tail -5 "logs/$log" | sed 's/^/      /'
        fi
    done
else
    echo -e "${YELLOW}⚠️  No logs directory found${NC}"
fi

echo ""

# Check dependencies
echo "4️⃣ Checking dependencies:"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
else
    echo -e "${RED}❌ node_modules not found${NC}"
    echo -e "${YELLOW}   Fix: pnpm install${NC}"
fi

echo ""

# Check .env file
echo "5️⃣ Checking configuration:"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    if grep -q "DATABASE_URL" .env && grep -q "JWT_SECRET" .env; then
        echo -e "${GREEN}✅ Required env variables found${NC}"
    else
        echo -e "${RED}❌ Missing required env variables${NC}"
        echo -e "${YELLOW}   Fix: Check .env file for DATABASE_URL and JWT_SECRET${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}   Fix: Copy .env.example to .env and configure it${NC}"
fi

echo ""
echo "📝 Recommended steps:"
echo "1. Start infrastructure: cd infra/compose && docker-compose up -d"
echo "2. Wait 30 seconds for services to be ready"
echo "3. Install dependencies: pnpm install"
echo "4. Run database migration: cd libs/db && pnpm db:push"
echo "5. Start services: bash scripts/start-all-services.sh"
echo "6. Check logs: tail -f logs/<service-name>.log"





