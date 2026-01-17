# Automation Fix - Skill-Based Auto-Assignment

## Issues Found and Fixed

### 1. **Authentication Issue** ✅ FIXED
**Problem:** The automation service was trying to fetch ticket data using `X-Org-Id` and `X-User-Id` headers, but the ticket service middleware only read `orgId` from JWT tokens.

**Fix:** Updated `apps/ticket-service/src/middleware/org-context.ts` to support system requests via `X-Org-Id` header as a fallback when no JWT token is present.

```typescript
// Support system requests via X-Org-Id header (for automation service, etc.)
if (!req.orgId && req.headers["x-org-id"]) {
  req.orgId = req.headers["x-org-id"] as string;
  req.userId = (req.headers["x-user-id"] as string) || "system";
}
```

### 2. **Bucket Assignment Issue** ✅ FIXED
**Problem:** The `assignToBucket` function only accepted `bucket_id`, but some automation rules use `bucket_name`.

**Fix:** Updated `apps/automation-service/src/services/rule-engine.service.ts` to support both `bucket_id` and `bucket_name` parameters. When `bucket_name` is provided, it fetches the bucket by name first.

## How Automation Works

1. **Ticket Creation**: When a ticket is created, the ticket-service emits a `ticket.created` event to Kafka
2. **Event Consumption**: The automation-service consumes this event from Kafka
3. **Rule Evaluation**: The service fetches all enabled automation rules for the organization
4. **Condition Matching**: Each rule's conditions are evaluated against the ticket
5. **Action Execution**: If conditions match, the rule's actions are executed (e.g., assign agent by skill)

## Testing the Automation

### Prerequisites
1. Make sure all services are running:
   - Kafka (for event streaming)
   - Automation Service (port 3004)
   - Ticket Service (port 3002)
   - Auth Service (port 3001)

2. Ensure you have:
   - At least one organization
   - At least one agent with skills assigned
   - At least one automation rule enabled for skill-based assignment

### Manual Test Steps

1. **Check Automation Rule Exists:**
   ```sql
   SELECT * FROM automation_rules 
   WHERE enabled = true 
   AND actions::text LIKE '%skill_match%';
   ```

2. **Check Agents Have Skills:**
   ```sql
   SELECT u.id, u.email, u.name, u.skills 
   FROM users u
   INNER JOIN user_roles ur ON u.id = ur.user_id
   INNER JOIN roles r ON ur.role_id = r.id
   WHERE r.name = 'agent' 
   AND u.is_active = true
   AND u.skills IS NOT NULL
   AND jsonb_array_length(u.skills) > 0;
   ```

3. **Create a Test Ticket:**
   - Use the API or UI to create a ticket
   - Set `required_skill` to match an agent's skill (e.g., "technical-support")
   - Leave `assigned_to` empty

4. **Wait and Check:**
   - Wait 2-5 seconds for automation to process
   - Check the ticket - it should be automatically assigned to an agent with matching skills

### Using the Test Script

Run the automated test script:

```bash
cd ticketing-platform
pnpm install  # if needed
cd apps/automation-service
pnpm install  # if needed
tsx ../../scripts/test-automation.ts
```

The script will:
- Check if automation rules exist
- Verify agents have skills
- Create a test ticket with a required_skill
- Wait for automation to process
- Verify the ticket was assigned

### Checking Logs

**Automation Service Logs:**
```bash
tail -f logs/automation-service.log
```

Look for:
- `Rule executed` - Rule was matched and executed
- `Agent assigned` - Agent was successfully assigned
- `No agent found to assign` - No matching agent found
- `Failed to fetch ticket data` - Authentication/connection issue

**Ticket Service Logs:**
```bash
tail -f logs/ticket-service.log
```

## Common Issues and Solutions

### Issue: "No agent found to assign"
**Causes:**
- No agents have the required skill
- All agents with the skill are inactive
- Agents don't have the `agent` role assigned

**Solution:**
- Assign skills to agents
- Ensure agents are active (`is_active = true`)
- Verify agents have the `agent` role

### Issue: "Failed to fetch ticket data"
**Causes:**
- Ticket service not running
- Authentication issue (should be fixed now)
- Network connectivity issue

**Solution:**
- Restart ticket-service
- Verify the middleware fix is applied
- Check service URLs in environment variables

### Issue: Automation not running at all
**Causes:**
- Automation service not running
- Kafka not running
- Event not being published

**Solution:**
- Start automation-service: `cd apps/automation-service && pnpm dev`
- Start Kafka: `cd infra/compose && docker-compose up -d kafka`
- Check Kafka connectivity in logs

## Verification Checklist

- [ ] Automation service is running (check port 3004)
- [ ] Kafka is running and connected
- [ ] Automation rules exist in database and are enabled
- [ ] Agents have skills assigned
- [ ] Ticket service middleware supports X-Org-Id headers
- [ ] Test ticket creation triggers automation
- [ ] Ticket gets assigned to agent with matching skill

## Next Steps

1. Restart the ticket-service to apply the middleware fix
2. Restart the automation-service to apply the bucket assignment fix
3. Run the test script or manually test
4. Check logs to verify automation is working

