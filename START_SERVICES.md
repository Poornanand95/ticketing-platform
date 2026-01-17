# Starting the Ticketing Platform Services

## Prerequisites

1. **Database**: Ensure PostgreSQL is running
2. **Infrastructure**: Start Docker services (PostgreSQL, Redis, Kafka, MinIO)
   ```bash
   docker-compose up -d
   ```

## Quick Start

### Option 1: Start All Services (Recommended)

```bash
cd ticketing-platform
bash scripts/start-all-services.sh
```

This will start all services in parallel:
- API Gateway (port 3000)
- Auth Service (port 3001)
- Ticket Service (port 3002)
- Notification Service (port 3003)
- Automation Service (port 3004)
- Reporting Service (port 3005)

### Option 2: Start Services Individually

Open separate terminal windows for each service:

**Terminal 1 - API Gateway:**
```bash
cd ticketing-platform
pnpm --filter @ticketing/api-gateway dev
```

**Terminal 2 - Auth Service:**
```bash
cd ticketing-platform
pnpm --filter @ticketing/auth-service dev
```

**Terminal 3 - Ticket Service:**
```bash
cd ticketing-platform
pnpm --filter @ticketing/ticket-service dev
```

**Terminal 4 - Notification Service:**
```bash
cd ticketing-platform
pnpm --filter @ticketing/notification-service dev
```

**Terminal 5 - Automation Service:**
```bash
cd ticketing-platform
pnpm --filter @ticketing/automation-service dev
```

**Terminal 6 - Reporting Service:**
```bash
cd ticketing-platform
pnpm --filter @ticketing/reporting-service dev
```

## Frontend Applications

**Terminal 7 - Agent Console:**
```bash
cd ticketing-platform/apps/frontend/agent-console
pnpm dev
```
Access at: http://localhost:3006

**Terminal 8 - Customer Portal:**
```bash
cd ticketing-platform/apps/frontend/customer-portal
pnpm dev
```
Access at: http://localhost:3007

## Verify Services

Check if services are running:
```bash
cd ticketing-platform
bash scripts/check-services.sh
```

## Database Seeding

### Quick Setup (Basic)
```bash
cd ticketing-platform
pnpm setup
```
Creates default organization, roles, and 3 users (admin, agent, customer).

### Full Seeding (Comprehensive Test Data)
```bash
cd ticketing-platform
pnpm seed-full
```
Creates:
- **2 Admins** (admin@example.com, admin2@example.com)
- **5 Agents** with different skills (including 1 manager, 1 inactive)
- **4 Customers**
- **10 Tickets** with various statuses, priorities, skills, and assignments

This seeds comprehensive test data covering all corner cases:
- Skill-based ticket assignment
- Unassigned tickets
- Tickets with/without required skills
- All ticket statuses (open, pending, resolved, closed)
- All priorities (low, medium, high, urgent)
- Different sources (email, web, api)
- Inactive agents
- Multiple agents with same skills

## Default Login Credentials

### Basic Setup (after `pnpm setup`):
- **Admin**: `admin@example.com` / `admin123`
- **Agent**: `agent@example.com` / `agent123`
- **Customer**: `customer@example.com` / `customer123`

### Full Seeding (after `pnpm seed-full`):
**Admins:**
- `admin@example.com` / `admin123`
- `admin2@example.com` / `admin123`

**Agents:**
- `manager@example.com` / `manager123` (multi-skill)
- `agent@example.com` / `agent123` (technical-support, bug-reports)
- `agent2@example.com` / `agent123` (billing, account-management)
- `agent3@example.com` / `agent123` (sales, product-questions)
- `agent4@example.com` / `agent123` (technical-support, integration-help)

**Customers:**
- `customer@example.com` / `customer123`
- `customer2@example.com` / `customer123`
- `customer3@example.com` / `customer123`
- `customer4@example.com` / `customer123`

## Stopping Services

Press `Ctrl+C` in each terminal window to stop the services.

To stop all services at once:
```bash
pkill -f "api-gateway|auth-service|ticket-service|notification-service|automation-service|reporting-service"
```

