# Automation Test Scenario - Skill-Based Auto-Assignment

## 🎯 Simple Test Scenario

**Goal:** Verify that when a ticket is created with a `required_skill`, it automatically gets assigned to an agent who has that skill.

## 📋 Prerequisites

1. **Services Running:**
   - ✅ Kafka (check: `docker ps | grep kafka`)
   - ✅ Automation Service (port 3004)
   - ✅ Ticket Service (port 3002)
   - ✅ Auth Service (port 3001)

2. **Database Setup:**
   - ✅ At least one organization
   - ✅ At least one agent with skills assigned
   - ✅ At least one customer
   - ✅ Automation rule enabled for skill-based assignment

## 🧪 Test Scenario Steps

### Option 1: Automated Test (Recommended)

Run the automated test script:

```bash
cd ticketing-platform
pnpm test-automation-simple
```

This script will:
1. Check if automation rule exists (create if missing)
2. Find an agent with skills
3. Create a test ticket with that agent's skill
4. Wait 10 seconds for automation to process
5. Check if ticket was assigned
6. Show detailed results

### Option 2: Manual Test

#### Step 1: Verify Setup

```bash
# Check services are running
curl http://localhost:3004/health  # Automation service
curl http://localhost:3002/health  # Ticket service
curl http://localhost:3001/health # Auth service

# Check Kafka
docker ps | grep kafka
```

#### Step 2: Check Database

```sql
-- Check if automation rule exists
SELECT name, enabled, priority, conditions, actions 
FROM automation_rules 
WHERE enabled = true 
AND actions::text LIKE '%skill_match%';

-- Check agents with skills
SELECT u.id, u.email, u.name, u.skills 
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'agent' 
AND u.is_active = true
AND u.skills IS NOT NULL
AND jsonb_array_length(u.skills) > 0;
```

#### Step 3: Create Test Ticket

**Via API:**
```bash
# 1. Login as customer
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@example.com", "password": "customer123"}'

# Save the accessToken from response

# 2. Create ticket with required_skill
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "subject": "[TEST] Automation test - skill assignment",
    "priority": "medium",
    "source": "web",
    "required_skill": "technical-support"
  }'

# Save the ticket ID from response
```

**Via UI:**
1. Go to customer portal: http://localhost:3007
2. Login as customer (e.g., customer1@example.com / customer123)
3. Create a new ticket
4. Set "Required Skill" to a skill that an agent has (e.g., "technical-support")
5. Submit the ticket

#### Step 4: Wait and Check

Wait 5-10 seconds, then check if ticket was assigned:

```bash
# Get ticket details
curl http://localhost:3000/tickets/TICKET_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Or check in the UI - the ticket should show an assigned agent.

#### Step 5: Check Logs

```bash
# Automation service logs
tail -f logs/automation-service.log

# Look for:
# - "Rule executed" - Rule matched and executed
# - "Agent assigned" - Agent was successfully assigned
# - "No agent found to assign" - No matching agent
# - "Failed to fetch ticket data" - Authentication issue
```

## 🔍 Troubleshooting

### Issue: Ticket not assigned

**Check 1: Automation Service Running?**
```bash
curl http://localhost:3004/health
# Should return: {"status":"ok","service":"automation-service"}
```

**Check 2: Kafka Running?**
```bash
docker ps | grep kafka
# Should show kafka container running
```

**Check 3: Automation Rule Enabled?**
```sql
SELECT name, enabled FROM automation_rules 
WHERE enabled = true 
AND actions::text LIKE '%skill_match%';
```

**Check 4: Agent Has Skills?**
```sql
SELECT u.name, u.skills 
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'agent' 
AND u.is_active = true
AND u.skills IS NOT NULL;
```

**Check 5: Event Published?**
```bash
# Check ticket-service logs for event emission
tail -f logs/ticket-service.log | grep "ticket.created"
```

**Check 6: Event Consumed?**
```bash
# Check automation-service logs for event consumption
tail -f logs/automation-service.log | grep "ticket.created"
```

### Issue: "Failed to fetch ticket data"

This means the automation service can't authenticate to ticket service.

**Fix:** Make sure ticket-service middleware supports X-Org-Id headers (we fixed this earlier, but restart the service).

### Issue: "No agent found to assign"

**Possible causes:**
- No agents have the required skill
- All agents with the skill are inactive
- Agents don't have the `agent` role

**Fix:**
```sql
-- Assign skill to an agent
UPDATE users 
SET skills = '["technical-support"]'::jsonb 
WHERE email = 'agent1@example.com';

-- Make sure agent is active
UPDATE users 
SET is_active = true 
WHERE email = 'agent1@example.com';
```

## 📊 Expected Results

### ✅ Success Indicators:
- Ticket is created successfully
- Within 5-10 seconds, ticket shows `assigned_to` field populated
- Assigned agent has the `required_skill` in their skills array
- Automation service logs show "Rule executed" and "Agent assigned"

### ❌ Failure Indicators:
- Ticket remains unassigned after 10+ seconds
- Automation service logs show errors
- "No agent found to assign" in logs
- "Failed to fetch ticket data" in logs

## 🎬 Quick Test Command

```bash
# Run the automated test
cd ticketing-platform
pnpm test-automation-simple
```

This will test the entire flow and give you a detailed report!

## 📝 Example Test Data

**Agent Setup:**
- Email: `agent1@example.com`
- Skills: `["technical-support", "bug-reports"]`
- Active: `true`

**Ticket Creation:**
- Subject: `"Test automation - technical support needed"`
- Required Skill: `"technical-support"`
- Priority: `"medium"`
- Source: `"web"`

**Expected Result:**
- Ticket should be assigned to `agent1@example.com` within 5-10 seconds

