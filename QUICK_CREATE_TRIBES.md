# Quick Create Demo Tribes - Railway

## Simple 3-Step Process

### Step 1: Get your Railway DATABASE_URL

1. Go to [Railway Dashboard](https://railway.app)
2. Open your HelpEm project
3. Click on **Postgres** service
4. Click **Variables** tab
5. Copy the `DATABASE_URL` value (starts with `postgresql://`)

### Step 2: Get your User ID

Run this query in Railway:
1. In Railway Postgres, click **Query** tab
2. Run:
```sql
SELECT id, apple_user_id, last_active_at 
FROM users 
ORDER BY last_active_at DESC 
LIMIT 5;
```
3. Copy your user `id` (the UUID)

### Step 3: Create the tribes

```bash
export DATABASE_URL="your-railway-database-url-from-step-1"
./seed-demo-tribes.sh your-user-id-from-step-2
```

**Example:**
```bash
export DATABASE_URL="postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway"
./seed-demo-tribes.sh "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## What You'll Get

✅ **Yoga Tribe** - 4 members, 5 messages, 1 appointment  
✅ **Beach Crew** - 4 members, 6 messages, 1 grocery list  
✅ **Blvd Burger** - 4 members, 7 messages, 2 proposals

All tribes will appear in your iOS app immediately after refreshing!

---

## Troubleshooting

**"User not found"**
- Make sure you copied the correct `id` (UUID format)
- Verify you're signed in to the app at least once

**"Database connection failed"**
- Double-check your DATABASE_URL is correct
- Make sure it starts with `postgresql://`
- Test connection: `psql "$DATABASE_URL" -c "SELECT 1;"`

**"Tribes not showing in app"**
- Pull to refresh in the app
- Check tribes were created: 
  ```bash
  psql "$DATABASE_URL" -c "SELECT * FROM tribes;"
  ```

---

## Alternative: One-Line Command

If you know both values:

```bash
DATABASE_URL="postgresql://..." ./seed-demo-tribes.sh "your-user-id"
```

This sets the DATABASE_URL and runs the script in one command!
