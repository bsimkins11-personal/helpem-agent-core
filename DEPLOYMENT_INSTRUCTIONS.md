# Deployment Instructions for Tribe Type Feature

## Overview
The tribe type feature has been implemented and pushed to GitHub. Here's how to deploy it.

## 1. Backend (Railway) ✅ AUTO-DEPLOYS

Railway will automatically deploy when it detects the push to `main`:
- Backend code changes will be deployed
- **Migration needs to be run manually** (see below)

## 2. Frontend (Vercel) ✅ AUTO-DEPLOYS

Vercel will automatically build and deploy:
- New tribe admin UI
- Tribe type selector in create form
- Settings tab updates

## 3. Database Migration ⚠️ MANUAL STEP REQUIRED

The database schema needs to be updated to add the `tribe_type` column.

### Option A: Run via Railway CLI (Recommended)

```bash
# Install Railway CLI if not installed
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run bash -c "psql \$DATABASE_URL < backend/migrations/add_tribe_type.sql"
```

### Option B: Run via Railway Dashboard

1. Go to Railway dashboard
2. Select the `helpem-agent-core` project
3. Go to the backend service
4. Click "Variables"
5. Copy the `DATABASE_URL`
6. Run locally:
   ```bash
   psql "<DATABASE_URL>" < backend/migrations/add_tribe_type.sql
   ```

### Option C: Via Prisma (If Prisma is configured)

```bash
cd backend
npx prisma db push
```

## Migration Contents

The migration will:
1. Add `tribe_type` column to `tribes` table
2. Set all existing tribes to `'friend'` type
3. Remove default for future inserts (admin must choose)

```sql
ALTER TABLE tribes 
ADD COLUMN tribe_type TEXT NOT NULL DEFAULT 'friend';

ALTER TABLE tribes 
ALTER COLUMN tribe_type DROP DEFAULT;
```

## 4. Verification Steps

### Test Backend API

```bash
# Create a friend tribe (should require tribeType)
curl -X POST https://api.helpem.ai/tribes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tribe", "tribeType": "friend"}'

# List tribes (should include tribeType)
curl https://api.helpem.ai/tribes \
  -H "Authorization: Bearer <token>"
```

### Test Frontend

1. Go to https://app.helpem.ai/tribe/admin
2. Click "Create New Tribe"
3. Should see tribe type selector (required)
4. Create a friend tribe
5. Go to Settings tab
6. Should see tribe type with ability to change

### Test Permissions

1. Create a **friend** tribe
2. Try to add a routine → Should get error
3. Change to **family** tribe
4. Try to add a routine → Should succeed

## 5. Expected Timeline

- **GitHub push:** ✅ Complete
- **Vercel deploy:** ~3-5 minutes (automatic)
- **Railway deploy:** ~2-3 minutes (automatic)
- **Migration:** Manual (see above)
- **iOS app update:** Immediate (loads from web)

## 6. Rollback Plan (If Needed)

If something goes wrong:

```bash
# Revert the migration
psql "$DATABASE_URL" << 'EOF'
ALTER TABLE tribes DROP COLUMN IF EXISTS tribe_type;
EOF

# Revert to previous commit
git revert fefd1c1
git push origin main
```

## 7. Post-Deployment

After successful deployment:

1. ✅ Test creating tribes with both types
2. ✅ Test changing tribe type
3. ✅ Test permission enforcement
4. ✅ Verify existing tribes are marked as 'friend'
5. ✅ Delete demo tribes (already marked as friend)

## Files Deployed

### Backend
- `backend/prisma/schema.prisma` - Schema update
- `backend/migrations/add_tribe_type.sql` - Migration
- `backend/src/routes/tribe.js` - API updates

### Frontend
- `web/src/app/tribe/admin/page.tsx` - UI updates

## Current Status

- ✅ Code committed to GitHub
- ⏳ Waiting for Vercel deployment
- ⏳ Waiting for Railway deployment
- ⚠️ **NEEDS MANUAL MIGRATION** (see Option A above)

---

**Next:** Run the migration using Option A, then test the feature!
