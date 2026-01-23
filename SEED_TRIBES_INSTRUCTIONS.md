# Create Demo Tribes - Step by Step

## Quick Test

**Test your database connection first:**
```bash
node test-seed-connection.js
```

This will:
- ✅ Verify DATABASE_URL is set
- ✅ Test database connection
- ✅ Show your user ID
- ✅ Give you the exact command to run

---

## Full Instructions

### Step 1: Set DATABASE_URL

```bash
export DATABASE_URL="your-postgres-connection-string"
```

Get this from Railway:
1. Go to your Railway project
2. Click on Postgres service
3. Go to Variables tab
4. Copy the `DATABASE_URL` value

### Step 2: Find Your User ID

**Option A: Auto-find it**
```bash
./get-my-user-id.sh
```

**Option B: Test connection script** (recommended)
```bash
node test-seed-connection.js
```

This will show you exactly what command to run next!

**Option C: Manual query**
```bash
psql $DATABASE_URL -c "SELECT id, apple_user_id FROM users ORDER BY last_active_at DESC LIMIT 5;"
```

Copy the UUID from the `id` column.

### Step 3: Create Demo Tribes

```bash
./seed-demo-tribes.sh YOUR_USER_ID
```

Replace `YOUR_USER_ID` with the UUID you found in Step 2.

**Example:**
```bash
./seed-demo-tribes.sh "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## What Gets Created

### 🧘‍♀️ Yoga Tribe
- **Members:** You + Sarah, Emma, Alex, Casey (4 total)
- **Messages:** 5 realistic messages about morning class
- **Proposals:** 1 appointment for Saturday yoga

### 🏄‍♂️ Beach Crew  
- **Members:** You + Jordan, Jamie, Riley (4 total)
- **Messages:** 6 messages planning surf trip
- **Proposals:** 1 grocery list (sunscreen, water, etc)

### 🍔 Blvd Burger
- **Members:** You + Mike, Sarah, Alex (4 total)
- **Messages:** 7 messages planning dinner
- **Proposals:** 2 (dinner appointment + parking reminder)

---

## Troubleshooting

### "DATABASE_URL is not set"
```bash
# Check if it's set
echo $DATABASE_URL

# If empty, set it
export DATABASE_URL="postgres://..."
```

### "User not found"
Make sure you:
1. Signed in to the app at least once
2. Used the correct user ID (UUID format)
3. The user exists in the database

Run this to verify:
```bash
psql $DATABASE_URL -c "SELECT * FROM users;"
```

### "Prisma Client error"
Generate the Prisma client:
```bash
cd backend
npx prisma generate
cd ..
```

### "Connection failed"
Test your database connection:
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

If this fails, your DATABASE_URL is incorrect.

### Tribes created but not showing in app
1. Pull to refresh in the app
2. Check the tribes table:
```bash
psql $DATABASE_URL -c "SELECT * FROM tribes;"
```
3. Check tribe members:
```bash
psql $DATABASE_URL -c "SELECT * FROM tribe_members WHERE user_id = 'YOUR_USER_ID';"
```

---

## Clean Up Demo Tribes

To remove all demo tribes:

```bash
psql $DATABASE_URL << 'EOF'
DELETE FROM tribes 
WHERE name IN ('Yoga Tribe', 'Beach Crew', 'Blvd Burger')
  AND owner_id = 'YOUR_USER_ID';
EOF
```

---

## Need Help?

1. **Run the test script first:**
   ```bash
   node test-seed-connection.js
   ```

2. **Check the logs:**
   - Look for error messages in the terminal
   - Check backend logs in Railway
   - Look for Prisma errors

3. **Verify your setup:**
   - DATABASE_URL is set
   - User exists in database
   - Prisma client is generated
   - Node version >= 22.12.0

4. **Still stuck?**
   Share the full error output and we'll debug it!
