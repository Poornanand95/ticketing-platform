#!/bin/bash

echo "🔍 Checking Service Health..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local name=$1
    local url=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name is running"
        return 0
    else
        echo -e "${RED}❌${NC} $name is NOT running"
        return 1
    fi
}

check_port() {
    local name=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Port $port ($name) is in use"
        return 0
    else
        echo -e "${RED}❌${NC} Port $port ($name) is NOT in use"
        return 1
    fi
}

echo "1️⃣ Checking Service Ports:"
check_port "API Gateway" 3000
check_port "Auth Service" 3001
check_port "Ticket Service" 3002
check_port "Notification Service" 3003
check_port "Automation Service" 3004
check_port "Reporting Service" 3005
check_port "Agent Console" 3006
check_port "Customer Portal" 3007
echo ""

echo "2️⃣ Checking Service Health Endpoints:"
check_service "API Gateway" "http://localhost:3000/health"
check_service "Auth Service" "http://localhost:3001/health"
check_service "Ticket Service" "http://localhost:3002/health"
check_service "Notification Service" "http://localhost:3003/health"
check_service "Automation Service" "http://localhost:3004/health"
check_service "Reporting Service" "http://localhost:3005/health"
echo ""

echo "3️⃣ Checking Infrastructure Ports:"
check_port "PostgreSQL" 5432
check_port "Redis" 6379
check_port "Kafka" 9092
check_port "MinIO API" 9000
echo ""

echo "📝 To start services:"
echo "   Infrastructure: cd ticketing-platform/infra/compose && docker-compose up -d"
echo "   Services: Use the start scripts or run individually with 'pnpm --filter @ticketing/<service> dev'"








