# API Accessibility Guide

## ✅ All APIs are accessible from Postman and external portals

All services are configured with CORS enabled and accessible through the API Gateway at `http://localhost:3000`.

---

## 🌐 API Gateway Configuration

**Base URL:** `http://localhost:3000`  
**Port:** 3000

### CORS Configuration
- ✅ **All origins allowed** (`origin: true`)
- ✅ **Credentials enabled** (`credentials: true`)
- ✅ **All HTTP methods supported** (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- ✅ **Preflight requests handled** (OPTIONS requests return 204)

---

## 📋 Available API Endpoints

### 🔐 Authentication Service (`/auth`)

**Base:** `http://localhost:3000/auth`  
**Auth Required:** ❌ No (public endpoints)

#### Endpoints:
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

**Example (Postman):**
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

---

### 👥 User Management (`/users`)

**Base:** `http://localhost:3000/users`  
**Auth Required:** ✅ Yes (Bearer token)

#### Endpoints:
- `GET /users` - List users (with filters: `?skill=technical-support`)
- `POST /users` - Create user (admin only)
- `GET /users/agents` - Get agents list (with skill filter)

**Example (Postman):**
```http
GET http://localhost:3000/users
Authorization: Bearer <your_access_token>
```

---

### 🏢 Organization Management (`/orgs`)

**Base:** `http://localhost:3000/orgs`  
**Auth Required:** ✅ Yes (Bearer token)

#### Endpoints:
- `GET /orgs/:id` - Get organization details

**Example (Postman):**
```http
GET http://localhost:3000/orgs/<org_id>
Authorization: Bearer <your_access_token>
```

---

### 🎫 Ticket Management (`/tickets`)

**Base:** `http://localhost:3000/tickets`  
**Auth Required:** ✅ Yes (Bearer token)

#### Endpoints:
- `GET /tickets` - List tickets (filters: `?status=open&priority=high&bucket_id=xxx&assigned_to=me`)
- `GET /tickets/:id` - Get ticket details
- `POST /tickets` - Create ticket
- `PATCH /tickets/:id` - Update ticket
- `GET /tickets/:id/messages` - Get ticket messages
- `POST /tickets/:id/messages` - Add message to ticket
- `GET /tickets/:id/attachments` - Get ticket attachments
- `POST /tickets/:id/attachments` - Upload attachment

**Example (Postman):**
```http
GET http://localhost:3000/tickets?status=open&priority=high
Authorization: Bearer <your_access_token>
```

```http
POST http://localhost:3000/tickets
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "subject": "New ticket",
  "priority": "medium",
  "source": "web",
  "required_skill": "technical-support",
  "bucket_id": "bucket_id_here"
}
```

---

### 🪣 Bucket Management (`/buckets`)

**Base:** `http://localhost:3000/buckets`  
**Auth Required:** ✅ Yes (Bearer token + Admin role)

#### Endpoints:
- `GET /buckets` - List buckets (optional: `?include_count=true` to get ticket counts)
- `GET /buckets/:id` - Get bucket details
- `POST /buckets` - Create bucket (admin only)
- `PATCH /buckets/:id` - Update bucket (admin only)
- `DELETE /buckets/:id` - Delete bucket (admin only, only if no tickets assigned)

**Example (Postman):**
```http
GET http://localhost:3000/buckets?include_count=true
Authorization: Bearer <your_access_token>
```

```http
POST http://localhost:3000/buckets
Authorization: Bearer <your_access_token>
Content-Type: application/json

{
  "name": "Urgent Issues",
  "tag": "urgent",
  "description": "High priority issues",
  "color": "#ef4444"
}
```

**Note:** Bucket deletion and name changes are restricted if tickets are assigned to the bucket.

---

### 📊 Reporting Service (`/reports`)

**Base:** `http://localhost:3000/reports`  
**Auth Required:** ✅ Yes (Bearer token)

#### Endpoints:
- `GET /reports/metrics` - Get metrics (query: `?org_id=xxx&start_date=2024-01-01&end_date=2024-12-31`)
- `GET /reports/agent-performance` - Get agent performance metrics

**Example (Postman):**
```http
GET http://localhost:3000/reports/metrics?org_id=<org_id>&start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <your_access_token>
```

---

### 🤖 Automation Service (`/automation`)

**Base:** `http://localhost:3000/automation`  
**Auth Required:** ✅ Yes (Bearer token)

#### Endpoints:
- `GET /automation/rules` - List automation rules
- `POST /automation/rules` - Create automation rule
- `GET /automation/rules/:id` - Get rule details
- `PATCH /automation/rules/:id` - Update rule
- `DELETE /automation/rules/:id` - Delete rule

**Example (Postman):**
```http
GET http://localhost:3000/automation/rules
Authorization: Bearer <your_access_token>
```

---

### 🔔 Notification Service (`/notifications`)

**Base:** `http://localhost:3000/notifications`  
**Auth Required:** ✅ Yes (Bearer token)

**Note:** Notification service primarily consumes Kafka events. Direct API endpoints may be limited.

---

## 🔑 Authentication Flow

### Step 1: Login
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "admin@example.com",
    "name": "Admin User",
    "org_id": "org_id",
    "roles": ["admin"]
  }
}
```

### Step 2: Use Access Token
Include the token in the `Authorization` header for all protected endpoints:

```http
Authorization: Bearer <accessToken>
```

### Step 3: Refresh Token (if expired)
```http
POST http://localhost:3000/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

---

## 📝 Postman Setup

### 1. Create Environment Variables
- `base_url`: `http://localhost:3000`
- `access_token`: (set after login)
- `refresh_token`: (set after login)
- `org_id`: (set after login)

### 2. Create Collection
1. **Login Request:**
   - Method: POST
   - URL: `{{base_url}}/auth/login`
   - Body: JSON with email and password
   - Tests: Save tokens to environment variables

2. **Get Tickets:**
   - Method: GET
   - URL: `{{base_url}}/tickets`
   - Headers: `Authorization: Bearer {{access_token}}`

3. **Create Ticket:**
   - Method: POST
   - URL: `{{base_url}}/tickets`
   - Headers: `Authorization: Bearer {{access_token}}`
   - Body: JSON with ticket data

### 3. Pre-request Script (Auto-refresh token)
Add to collection pre-request script to automatically refresh expired tokens.

---

## ✅ CORS Status by Service

| Service | CORS Enabled | Configuration |
|---------|-------------|---------------|
| API Gateway | ✅ Yes | All origins, all methods |
| Auth Service | ✅ Yes | Default CORS (all origins) |
| Ticket Service | ✅ Yes | Default CORS (all origins) |
| Notification Service | ✅ Yes | Default CORS (all origins) |
| Automation Service | ✅ Yes | Default CORS (all origins) |
| Reporting Service | ✅ Yes | Default CORS (all origins) |

---

## 🚨 Important Notes

1. **API Gateway is the entry point:** All requests should go through `http://localhost:3000`
2. **Direct service access:** Services can be accessed directly (e.g., `http://localhost:3001/auth/login`), but API Gateway is recommended
3. **Authentication:** Most endpoints require a valid JWT token in the `Authorization` header
4. **Role-based access:** Some endpoints (like bucket management) require admin role
5. **CORS:** All services have CORS enabled, so external portals can access them
6. **Health checks:** All services have `/health` endpoints for monitoring

---

## 🔍 Testing with cURL

### Login Example:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Get Tickets Example:
```bash
curl -X GET http://localhost:3000/tickets \
  -H "Authorization: Bearer <your_token>"
```

### Create Ticket Example:
```bash
curl -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test ticket",
    "priority": "medium",
    "source": "web"
  }'
```

---

## 📚 Summary

✅ **All APIs are accessible from:**
- Postman
- cURL
- External web portals
- Mobile applications
- Any HTTP client

✅ **CORS is properly configured** for cross-origin requests

✅ **Authentication is standardized** using JWT Bearer tokens

✅ **API Gateway routes all requests** to appropriate services

✅ **All services have CORS enabled** for external access

---

## 🛠️ Troubleshooting

### Issue: CORS errors
**Solution:** Ensure you're using the API Gateway (`http://localhost:3000`) and not accessing services directly.

### Issue: 401 Unauthorized
**Solution:** 
1. Login first to get an access token
2. Include `Authorization: Bearer <token>` header
3. Check if token is expired (refresh if needed)

### Issue: 403 Forbidden
**Solution:** Check if your user has the required role (e.g., admin for bucket management).

### Issue: Service unavailable (503)
**Solution:** Ensure the target service is running and accessible.





