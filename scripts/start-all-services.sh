#!/bin/bash

# Start all services in parallel using pnpm
echo "🚀 Starting all ticketing platform services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if infrastructure is running
echo -e "${YELLOW}📦 Checking infrastructure...${NC}"
if ! lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running on port 5432${NC}"
    echo -e "${YELLOW}   Please start infrastructure first:${NC}"
    echo -e "${YELLOW}   cd infra/compose && docker-compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Infrastructure is running${NC}"
echo ""

# Start services in background with output redirection
echo -e "${GREEN}Starting services...${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start services in background and redirect output to log files
echo -e "${YELLOW}Starting API Gateway (port 3000)...${NC}"
pnpm --filter @ticketing/api-gateway dev > logs/api-gateway.log 2>&1 &
API_GATEWAY_PID=$!

echo -e "${YELLOW}Starting Auth Service (port 3001)...${NC}"
pnpm --filter @ticketing/auth-service dev > logs/auth-service.log 2>&1 &
AUTH_SERVICE_PID=$!

echo -e "${YELLOW}Starting Ticket Service (port 3002)...${NC}"
pnpm --filter @ticketing/ticket-service dev > logs/ticket-service.log 2>&1 &
TICKET_SERVICE_PID=$!

echo -e "${YELLOW}Starting Notification Service (port 3003)...${NC}"
pnpm --filter @ticketing/notification-service dev > logs/notification-service.log 2>&1 &
NOTIFICATION_SERVICE_PID=$!

echo -e "${YELLOW}Starting Automation Service (port 3004)...${NC}"
pnpm --filter @ticketing/automation-service dev > logs/automation-service.log 2>&1 &
AUTOMATION_SERVICE_PID=$!

echo -e "${YELLOW}Starting Reporting Service (port 3005)...${NC}"
pnpm --filter @ticketing/reporting-service dev > logs/reporting-service.log 2>&1 &
REPORTING_SERVICE_PID=$!

echo ""
echo -e "${YELLOW}⏳ Waiting for services to start (10 seconds)...${NC}"
sleep 10

# Check if services are running
echo ""
echo -e "${GREEN}Checking service status...${NC}"
check_port() {
    local name=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name is running on port $port"
        return 0
    else
        echo -e "${RED}❌${NC} $name is NOT running on port $port"
        return 1
    fi
}

check_port "API Gateway" 3000
check_port "Auth Service" 3001
check_port "Ticket Service" 3002
check_port "Notification Service" 3003
check_port "Automation Service" 3004
check_port "Reporting Service" 3005

echo ""
echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo -e "${YELLOW}Logs are available in the 'logs' directory:${NC}"
echo "  - logs/api-gateway.log"
echo "  - logs/auth-service.log"
echo "  - logs/ticket-service.log"
echo "  - logs/notification-service.log"
echo "  - logs/automation-service.log"
echo "  - logs/reporting-service.log"
echo ""
echo -e "${YELLOW}To stop all services, press Ctrl+C or run:${NC}"
echo "  pkill -f 'api-gateway|auth-service|ticket-service|notification-service|automation-service|reporting-service'"
echo ""
echo -e "${YELLOW}To view logs in real-time:${NC}"
echo "  tail -f logs/<service-name>.log"
echo ""

# Wait for all background processes
wait





