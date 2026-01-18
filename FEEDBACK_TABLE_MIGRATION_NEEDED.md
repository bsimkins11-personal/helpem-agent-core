# 🚨 URGENT: Feedback Table Migration Required

## Problem
The feedback API is returning 500 errors because the `feedback` table doesn't exist in the database yet.

## Error in Logs
```
[Error] Failed to load resource: the server responded with a status of 500 () (feedback, line 0)
```

## Solution
Run the feedback table migration on Railway:

### Option 1: Via Railway Dashboard
1. Go to Railway dashboard
2. Open your Postgres database
3. Go to "Query" tab
4. Copy and paste the contents of `backend/migrations/add-feedback-table.sql`
5. Click "Run Query"

### Option 2: Via Railway CLI
```bash
# Connect to Railway database
railway connect

# Run migration
psql $DATABASE_URL < backend/migrations/add-feedback-table.sql
```

### Option 3: Via Migration Script (Locally)
```bash
# Set DATABASE_PUBLIC_URL from Railway
export DATABASE_PUBLIC_URL="your-railway-postgres-url"

# Run migration
cd backend
node scripts/run-feedback-migration.js
```

## What This Creates
The migration creates a `feedback` table with:
- `id` (UUID, primary key)
- `user_id` (VARCHAR, user who gave feedback)
- `message_id` (VARCHAR, which message was rated)
- `feedback` (VARCHAR, 'up' or 'down')
- `user_message` (TEXT, original user input)
- `assistant_response` (TEXT, AI response)
- `action_type` (VARCHAR, type of action: add/update/delete)
- `action_data` (JSONB, full action details)
- `correction` (TEXT, user explanation for thumbs down)
- `created_at` (TIMESTAMP)

Plus indexes for efficient queries.

## Why This Happened
The feedback system was implemented today but the database migration wasn't run yet. The table needs to be created before the feedback API will work.

## Verification
After running the migration, test by:
1. Creating an item in the app (todo, appointment, etc.)
2. Click 👍 or 👎 on the action
3. Check that no 500 error appears in console
4. Feedback should be saved successfully

## Status
- ❌ Migration NOT run yet
- ❌ Feedback API currently failing with 500 errors
- ✅ Migration script ready at `backend/scripts/run-feedback-migration.js`
- ✅ Migration SQL ready at `backend/migrations/add-feedback-table.sql`

**Run this migration ASAP to fix the 500 errors!**
