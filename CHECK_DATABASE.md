# Check Database Storage

## Quick Test Commands

### Option 1: Via Railway Dashboard

1. Go to Railway dashboard
2. Click on your Postgres service
3. Click "Data" tab
4. Run this query:

```sql
SELECT * FROM user_inputs ORDER BY created_at DESC LIMIT 10;
```

You should see your test messages!

### Option 2: Via Railway CLI

```bash
# Install Railway CLI (if not already)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Connect to database
railway run psql $DATABASE_URL

# Then run:
SELECT * FROM user_inputs ORDER BY created_at DESC LIMIT 10;
```

### Option 3: Check Railway Logs

1. Go to Railway → Your backend service → Deployments
2. Click on the running deployment
3. Look for logs showing:
   ```
   📡 API: POST /test-db
   📊 Status: 200
   ```

## What to Look For

**In the database, you should see:**
- `id`: UUID of the entry
- `user_id`: UUID of the test user (from mock session)
- `content`: Your test message text
- `type`: "text" or "voice"
- `created_at`: Timestamp when saved

**Example successful entry:**
```
id                   | abc123...
user_id              | def456...
content              | Test message from iOS
type                 | text
created_at           | 2026-01-15 04:30:00
```

## Troubleshooting

### Error: "You are not signed in"
**Problem:** Mock session token not valid for Railway
**Expected:** This is normal - mock tokens don't pass backend validation
**Solution:** You'll see the error in the app, but we're testing the code path

### Error: Network timeout
**Problem:** Can't reach Railway backend
**Check:**
- Railway service is running
- Backend URL is correct in APIClient.swift
- Phone has internet connection

### Success but no data in DB
**Check:**
- Backend logs show 200 status
- user_id being sent correctly
- Database connection working (test with `/health` endpoint)
