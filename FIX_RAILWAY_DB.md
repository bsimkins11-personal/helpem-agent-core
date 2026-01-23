# Fix Railway Database Migration

## Issue
Migration `009_add_activity_hidden_state` is stuck in failed state, blocking all DB operations.

## Fix Steps

### 1. Open Railway Dashboard
Already opened with: `railway open`

### 2. Navigate to Database
- Click on your **Postgres** service
- Go to the **Query** tab

### 3. Run This SQL
```sql
UPDATE "_prisma_migrations"
SET finished_at = NOW(),
    rolled_back_at = NULL
WHERE migration_name = '009_add_activity_hidden_state';
```

### 4. Verify Fix
Run this to check:
```sql
SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name = '009_add_activity_hidden_state';
```

Should show `finished_at` populated and `rolled_back_at` as NULL.

### 5. Redeploy API
Back in terminal:
```bash
railway redeploy --service api --yes
```

### 6. Test iOS App
- Open iOS app
- Try to access Tribes
- Should work now!

---

## What This Does

The migration actually **succeeded** (the table was created), but Prisma didn't mark it as complete. 

This SQL manually marks it as finished so:
- Prisma stops complaining
- Subsequent migrations can run
- API can access the database

---

## If This Doesn't Work

The migration might be partially applied. In that case:

```sql
-- Drop the table and mark as rolled back
DROP TABLE IF EXISTS "tribe_activity_hidden_by" CASCADE;

UPDATE "_prisma_migrations"
SET rolled_back_at = NOW(),
    finished_at = NULL
WHERE migration_name = '009_add_activity_hidden_state';
```

Then redeploy to rerun the migration.
