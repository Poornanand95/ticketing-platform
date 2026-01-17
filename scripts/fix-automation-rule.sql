-- Fix automation rule to include skill_match strategy
-- This script fixes the automation rule that has empty params

UPDATE automation_rules 
SET actions = '[{"type": "assign_agent", "params": {"strategy": "skill_match"}}]'::jsonb
WHERE enabled = true 
AND actions::text LIKE '%assign_agent%'
AND (actions::text NOT LIKE '%skill_match%' OR actions::text LIKE '%"params":{}%');

-- Verify the fix
SELECT name, enabled, priority, conditions, actions 
FROM automation_rules 
WHERE enabled = true 
AND actions::text LIKE '%skill_match%';

