# Simple Automation Test Scenario

## 🎯 Test Scenario: Skill-Based Auto-Assignment

**What we're testing:** When you create a ticket with a `required_skill`, it should automatically assign to an agent who has that skill.

## 📝 Step-by-Step Test

### Step 1: Verify Setup (30 seconds)

```bash
# Check services
curl http://localhost:3004/health  # Should return: {"status":"ok","service":"automation-service"}
curl http://localhost:3002/health  # Should return: {"status":"ok","service":"ticket-service"}

# Check Kafka
docker ps | grep kafka  # Should show kafka running
```

### Step 2: Check Database (1 minute)

```bash
# Check automation rule
docker exec -i ticketing-postgres psql -U postgres -d ticketing -c \
  "SELECT name, enabled, actions FROM automation_rules WHERE enabled = true;"

# Check agents with skills
docker exec -i ticketing-postgres psql -U postgres -d ticketing -c \
  "SELECT u.email, u.name, u.skills FROM users u INNER JOIN user_roles ur ON u.id = ur.user_id INNER JOIN roles r ON ur.role_id = r.id WHERE r.name = 'agent' AND u.is_active = true AND u.skills IS NOT NULL LIMIT 5;"
```

**Expected:** 
- At least one automation rule with `"strategy": "skill_match"` in actions
- At least one agent with skills array populated

### Step 3: Create Test Ticket (2 minutes)

**Option A: Using the Test Script (Easiest)**
```bash
cd ticketing-platform
pnpm test-automation-simple
```

**Option B: Manual via API**
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@example.com", "password": "customer123"}' \
  | jq -r '.accessToken')

# 2. Create ticket with required_skill
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "subject": "[AUTOMATION TEST] Need technical support help",
    "priority": "medium",
    "source": "web",
    "required_skill": "technical-support"
  }' | jq -r '.id'

# Save the ticket ID from output
```

**Option C: Manual via UI**
1. Go to http://localhost:3007
2. Login as customer (customer1@example.com / customer123)
3. Click "Create New Ticket"
4. Fill in:
   - Subject: "Test automation - technical support"
   - Required Skill: "technical-support"
   - Priority: Medium
5. Submit

### Step 4: Wait and Verify (10 seconds)

Wait 5-10 seconds, then check:

```bash
# Replace TICKET_ID with the ID from step 3
curl http://localhost:3000/tickets/TICKET_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.assigned_to'
```

**Expected Result:** Should show an agent ID (not null)

Or check in UI - the ticket should show an assigned agent.

### Step 5: Check Logs (1 minute)

```bash
# Watch automation service logs
tail -f logs/automation-service.log

# Look for these messages:
# ✅ "Rule executed" - Rule matched
# ✅ "Agent assigned" - Success!
# ❌ "No agent found to assign" - No matching agent
# ❌ "Failed to fetch ticket data" - Auth issue
```

## 🔧 Quick Fixes

### Fix 1: Update Automation Rule

If the rule has empty params, fix it:

```bash
docker exec -i ticketing-postgres psql -U postgres -d ticketing -c \
  "UPDATE automation_rules SET actions = '[{\"type\": \"assign_agent\", \"params\": {\"strategy\": \"skill_match\"}}]'::jsonb WHERE enabled = true AND actions::text LIKE '%assign_agent%';"
```

### Fix 2: Assign Skills to Agents

```bash
# Assign technical-support skill to an agent
docker exec -i ticketing-postgres psql -U postgres -d ticketing -c \
  "UPDATE users SET skills = '[\"technical-support\"]'::jsonb WHERE email = 'agent1@example.com';"
```

### Fix 3: Restart Services

```bash
# Restart automation service to apply fixes
# (Stop and start the service)
```

## ✅ Success Criteria

After creating a ticket with `required_skill: "technical-support"`:

1. ✅ Ticket is created successfully
2. ✅ Within 10 seconds, `assigned_to` field is populated
3. ✅ Assigned agent has "technical-support" in their skills
4. ✅ Automation service logs show "Agent assigned"

## 🐛 Common Issues

### Issue: "No agent found to assign"
**Cause:** No agents have the required skill
**Fix:** Assign the skill to an agent (see Fix 2 above)

### Issue: "Failed to fetch ticket data"
**Cause:** Authentication issue between services
**Fix:** Restart ticket-service (middleware fix should be applied)

### Issue: Ticket never gets assigned
**Cause:** Automation service not running or Kafka not connected
**Fix:** 
- Check automation service: `curl http://localhost:3004/health`
- Check Kafka: `docker ps | grep kafka`
- Check logs: `tail -f logs/automation-service.log`

## 📊 Example Test Data

**Agent:**
- Email: `agent4@example.com`
- Skills: `["technical-support", "integration-help"]`

**Ticket:**
- Subject: `"Need help with technical issue"`
- Required Skill: `"technical-support"`
- Priority: `"medium"`

**Expected:**
- Assigned to: `agent4@example.com` (or another agent with technical-support skill)

## 🚀 Quick Test Command

```bash
# Run automated test
cd ticketing-platform
pnpm test-automation-simple
```

This will test everything and show you exactly what's happening!

