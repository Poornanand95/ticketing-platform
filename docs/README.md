# Ticketing Platform

A multi-tenant SaaS ticketing platform similar to Freshdesk, built with microservices architecture.

## Overview

This platform provides a comprehensive ticketing system with support for:
- Multi-tenant organization isolation
- Ticket management with status, priority, and assignment
- Messaging system with public/private messages
- File attachments with S3-compatible storage
- Email ingestion and notifications
- Automation rules and SLA management
- Reporting and analytics
- Role-based access control (Admin, Agent, Customer)

## Architecture

```
ticketing-platform/
├── apps/              # Microservices and frontend applications
│   ├── api-gateway/   # API Gateway service (port 3000)
│   ├── auth-service/  # Authentication service (port 3001)
│   ├── ticket-service/ # Core ticket service (port 3002)
│   ├── notification-service/ # Email/notification service (port 3003)
│   ├── automation-service/ # Automation rules & SLA (port 3004)
│   ├── reporting-service/ # Metrics and reporting (port 3005)
│   └── frontend/      # Next.js applications
│       ├── agent-console/ # Agent interface (port 3006)
│       └── customer-portal/ # Customer interface (port 3007)
├── libs/              # Shared libraries
│   ├── config/        # Configuration management
│   ├── logger/        # Logging utilities
│   ├── types/         # TypeScript types
│   ├── db/            # Database schema and client
│   ├── auth/          # Authentication utilities
│   └── events/        # Event system (Kafka)
└── infra/             # Infrastructure
    ├── docker/        # Dockerfiles
    ├── compose/       # Docker Compose
    └── k8s/           # Kubernetes manifests
```

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis (rate limiting, caching, SLA timers)
- **Message Queue**: Kafka with Zookeeper
- **Storage**: MinIO (S3-compatible) or AWS S3
- **Authentication**: JWT tokens
- **Email**: Nodemailer with Handlebars templates

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Package Manager**: pnpm with workspace support

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm installed
- Docker Desktop running
- Ports 3000-3007, 5432, 6379, 9092, 9000-9001 available

### Step 1: Start Infrastructure

```bash
cd ticketing-platform/infra/compose
docker-compose up -d
```

Wait ~30 seconds for services to be ready (PostgreSQL, Redis, Kafka, MinIO).

### Step 2: Install Dependencies

```bash
# From monorepo root
pnpm install
```

### Step 3: Setup Database

```bash
cd ticketing-platform/libs/db
pnpm db:push
```

### Step 4: Seed Default Roles

```bash
cd ticketing-platform/apps/auth-service
pnpm seed
```

This creates default roles: `admin`, `agent`, `customer`.

### Step 5: Setup Initial Users

```bash
cd ticketing-platform/apps/auth-service
pnpm setup
```

**Default Credentials:**
- **Admin**: `admin@example.com` / `admin123`
- **Agent**: `agent@example.com` / `agent123`
- **Customer**: `customer@example.com` / `customer123`

You can customize these by setting environment variables before running setup:
```env
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-password
AGENT_EMAIL=your-agent@example.com
AGENT_PASSWORD=your-password
CUSTOMER_EMAIL=your-customer@example.com
CUSTOMER_PASSWORD=your-password
```

### Step 6: Start Services

**Option A: Start individually (recommended for development)**

```bash
# Terminal 1 - API Gateway
pnpm --filter @ticketing/api-gateway dev

# Terminal 2 - Auth Service
pnpm --filter @ticketing/auth-service dev

# Terminal 3 - Ticket Service
pnpm --filter @ticketing/ticket-service dev

# Terminal 4 - Notification Service
pnpm --filter @ticketing/notification-service dev

# Terminal 5 - Automation Service
pnpm --filter @ticketing/automation-service dev

# Terminal 6 - Reporting Service
pnpm --filter @ticketing/reporting-service dev
```

**Option B: Start all at once**

```bash
cd ticketing-platform
./scripts/start-all-services.sh
```

### Step 7: Start Frontend Apps (Optional)

```bash
# Terminal 7 - Agent Console (Admin/Agent Portal)
pnpm --filter @ticketing/agent-console dev

# Terminal 8 - Customer Portal
pnpm --filter @ticketing/customer-portal dev
```

### Step 8: Login to Admin Portal

Once the Agent Console is running, access it at:

**URL**: `http://localhost:3006`

**Login Credentials**:
- **Admin**: 
  - Email: `admin@example.com`
  - Password: `admin123`
- **Agent**: 
  - Email: `agent@example.com`
  - Password: `agent123`

**Note**: The Agent Console serves as the admin portal where both admins and agents can manage tickets, view reports, and configure automation rules.

**Customer Portal** (if needed):
- **URL**: `http://localhost:3007`
- **Login**: 
  - Email: `customer@example.com`
  - Password: `customer123`

**Important**: Make sure you've completed Steps 1-6 (infrastructure, database setup, user creation) before attempting to login.

## Service Ports

| Service | Port | Health Endpoint |
|---------|------|----------------|
| API Gateway | 3000 | `/health` |
| Auth Service | 3001 | `/health` |
| Ticket Service | 3002 | `/health` |
| Notification Service | 3003 | `/health` |
| Automation Service | 3004 | `/health` |
| Reporting Service | 3005 | `/health` |
| Agent Console | 3006 | - |
| Customer Portal | 3007 | - |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| Kafka | 9092 | - |
| Zookeeper | 2181 | - |
| MinIO API | 9000 | - |
| MinIO Console | 9001 | - |

### Port Configuration

Each service uses a unique default port. To override, use service-specific environment variables:
- `API_GATEWAY_PORT`
- `AUTH_SERVICE_PORT`
- `TICKET_SERVICE_PORT`
- `NOTIFICATION_SERVICE_PORT`
- `AUTOMATION_SERVICE_PORT`
- `REPORTING_SERVICE_PORT`

**Important**: Do NOT set `PORT=3000` globally - this will cause all services to conflict.

## Environment Variables

Required environment variables (see `libs/config/src/index.ts` for full schema):

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticketing

# JWT Secrets (min 32 characters)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# S3/MinIO (Optional)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=tickets

# SMTP (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

## API Gateway Routes

All routes go through the API Gateway (port 3000):

| Path | Target Service | Auth Required |
|------|---------------|---------------|
| `/auth` | Auth Service | ❌ No |
| `/users` | Auth Service | ✅ Yes |
| `/orgs` | Auth Service | ✅ Yes |
| `/tickets` | Ticket Service | ✅ Yes |
| `/notifications` | Notification Service | ✅ Yes |
| `/automation` | Automation Service | ✅ Yes |
| `/reports` | Reporting Service | ✅ Yes |

## Core Features

### Ticket Management
- Create tickets via web, email, or API
- Automatic ticket numbering (format: `TCK-XXXX-XXXX`)
- Status management (Open, Pending, Resolved, Closed)
- Priority levels (Low, Medium, High, Urgent)
- Agent assignment
- Filtering and pagination
- Soft delete support

### Messaging
- Public and private messages
- Message history with chronological display
- Privacy filtering based on user permissions

### File Attachments
- Presigned URL generation for secure uploads
- S3-compatible storage (MinIO or AWS S3)
- Secure download URLs with expiration

### Email Integration
- Automatic ticket creation from emails
- Email parsing and ticket linking
- Email notifications via SMTP

### Automation & SLA
- Rule-based automation with conditions and actions
- SLA timer tracking
- Response time monitoring
- SLA breach detection

### Reporting
- Ticket volume metrics
- Average response time
- SLA compliance percentage
- Agent performance metrics

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Agent, Customer)
- Multi-organization support
- Organization-based data isolation

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server (per service)
pnpm --filter @ticketing/<service-name> dev

# Build service
pnpm --filter @ticketing/<service-name> build

# Database migrations
cd ticketing-platform/libs/db && pnpm db:push

# Seed roles
cd ticketing-platform/apps/auth-service && pnpm seed

# Setup users
cd ticketing-platform/apps/auth-service && pnpm setup
```

### Infrastructure Commands

```bash
# Start infrastructure
cd ticketing-platform/infra/compose && docker-compose up -d

# Stop infrastructure
cd ticketing-platform/infra/compose && docker-compose down

# View logs
cd ticketing-platform/infra/compose && docker-compose logs -f
```

## Testing

### Test API Gateway

```bash
curl http://localhost:3000/health
```

### Test Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com","password":"agent123"}'
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000

# Kill the process
lsof -ti :3000 | xargs kill -9
```

### Docker Not Running

Ensure Docker Desktop is running before starting infrastructure:
```bash
docker info
```

### Database Connection Failed

- Verify PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` environment variable
- Wait 30-60 seconds for PostgreSQL to be ready

### "Invalid credentials" Error

Make sure you ran `pnpm setup` after seeding roles:
```bash
cd ticketing-platform/apps/auth-service
pnpm seed
pnpm setup
```

### Kafka Connection Failed

- Verify Kafka and Zookeeper are running
- Check `KAFKA_BROKERS` environment variable
- Ensure Zookeeper starts before Kafka (docker-compose handles this)

### "EMFILE: too many open files" Error

This error occurs when file watchers exceed system limits. The Next.js configs have been updated to ignore unnecessary directories. If the issue persists:

**macOS/Linux:**
```bash
# Check current limit
ulimit -n

# Increase limit for current session
ulimit -n 65536

# Or add to ~/.zshrc or ~/.bashrc for permanent fix
echo "ulimit -n 65536" >> ~/.zshrc
```

**Restart your development server** after increasing the limit. The Next.js configs now ignore:
- `node_modules` directories
- Other service directories in the monorepo
- Build artifacts (`.next`, `dist`, `build`)
- Infrastructure and library directories

### 404 Error on Routes (e.g., `/login`)

If you're getting 404 errors on routes that should exist:

1. **Clear Next.js cache and restart:**
   ```bash
   # Stop the dev server (Ctrl+C)
   # Remove .next directory
   rm -rf ticketing-platform/apps/frontend/agent-console/.next
   rm -rf ticketing-platform/apps/frontend/customer-portal/.next
   
   # Restart the dev server
   pnpm --filter @ticketing/agent-console dev
   pnpm --filter @ticketing/customer-portal dev
   ```

2. **Verify the route exists:**
   - Check that `src/app/login/page.tsx` exists
   - Ensure the file exports a default component

3. **Check the terminal for compilation errors:**
   - Look for TypeScript or build errors
   - Fix any import or syntax errors

## Security Notes

⚠️ **IMPORTANT**: Default passwords are for development only!

For production:
- Use strong, randomly generated passwords
- Change default passwords immediately
- Use environment variables for secure configuration
- Enable HTTPS/TLS for all services
- Implement proper secrets management

## Service Communication

- **Synchronous**: HTTP/REST via API Gateway
- **Asynchronous**: Kafka event streaming
- **Data Flow**: Client → API Gateway → Service → Kafka → Other Services

## Event System

The platform uses Kafka for event-driven architecture:

- **Event Types**: `ticket.created`, `ticket.updated`, `ticket.closed`, `ticket.assigned`, `ticket.replied`
- **Topics**: `ticket.events`, `notification.queue`, `automation.queue`, `sla.breaches`
- **Consumers**: Automation service, Notification service

## Database Schema

Core tables:
- `organizations` - Multi-tenant organization data
- `users` - User accounts with org association
- `roles` - Role definitions with permissions
- `user_roles` - User-role associations
- `tickets` - Core ticket data
- `ticket_messages` - Ticket conversation messages
- `attachments` - File attachment metadata
- `automation_rules` - Automation rule definitions
- `sla_policies` - SLA policy definitions
- `audit_logs` - Audit trail for actions

All tables support soft deletes and have optimized indexes.
