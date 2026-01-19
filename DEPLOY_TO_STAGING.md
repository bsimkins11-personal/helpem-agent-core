# 🚀 Deploy to Staging - Complete Guide

**Date:** 2026-01-19  
**Status:** Ready for deployment  
**UAT Pass Rate:** 95% (57/60 tests)

---

## Pre-Deployment Checklist

### ✅ Prerequisites
- [x] UAT simulation complete (95% pass rate)
- [x] Groceries API implemented
- [x] Groceries table verified
- [x] iOS Build 15 ready
- [x] Yellow dot fix verified
- [ ] Environment variables configured (verify below)
- [ ] Database backups enabled

---

## Step 1: Verify Environment Variables

### Vercel (Web App)
Required environment variables in Vercel dashboard:

```bash
# Database
DATABASE_URL=postgresql://...  # Railway Postgres connection string

# Authentication
JWT_SECRET=your-jwt-secret-here
APPLE_CLIENT_ID=com.helpem.app
APPLE_TEAM_ID=your-apple-team-id

# OpenAI
OPENAI_API_KEY=sk-...

# Optional (for monitoring)
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://app.helpem.ai
```

**How to verify:**
1. Go to https://vercel.com/your-org/helpem-web/settings/environment-variables
2. Check all variables are set
3. Ensure no variables have (empty) value

---

### Railway (Backend/Database)
Required environment variables in Railway:

```bash
# Database (automatically set by Railway)
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=postgres
PGPASSWORD=...
PGDATABASE=railway

# Node
NODE_ENV=production
```

**How to verify:**
1. Go to Railway dashboard → Your project → Variables
2. Database variables should be auto-generated
3. Set NODE_ENV=production if not set

---

## Step 2: Deploy Web App to Vercel

### Option A: Deploy via Git (Recommended)

```bash
# 1. Ensure you're on main branch
git checkout main

# 2. Pull latest changes
git pull origin main

# 3. Verify no uncommitted changes
git status

# 4. Push to trigger auto-deploy
git push origin main
```

Vercel will auto-deploy when you push to main.

**Monitor deployment:**
1. Go to https://vercel.com/your-org/helpem-web
2. Watch "Deployments" tab
3. Wait for "Ready" status (usually 2-3 minutes)

---

### Option B: Manual Deploy via Vercel CLI

```bash
# 1. Install Vercel CLI (if not installed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Navigate to web directory
cd web

# 4. Deploy to production
vercel --prod

# 5. Confirm deployment
# Follow prompts, confirm production deployment
```

---

## Step 3: Verify Database Schema

### Connect to Railway Database

```bash
# 1. Get connection string from Railway dashboard
# Format: postgresql://postgres:password@host:port/railway

# 2. Connect using psql (if installed)
psql "postgresql://postgres:password@host:port/railway"

# OR use Railway CLI
railway login
railway link
railway connect postgres
```

### Run Verification Script

```sql
-- Copy and paste from migrations/verify_all_tables.sql
-- or run directly:
\i migrations/verify_all_tables.sql
```

**Expected output:**
```
table_name     | exists
---------------|-------
users          | t
todos          | t
appointments   | t
habits         | t
groceries      | t
feedback       | t
```

If groceries table is missing:
```sql
\i migrations/verify_groceries_table.sql
```

---

## Step 4: Deploy iOS App to TestFlight

### Build and Archive in Xcode

```bash
# 1. Open Xcode project
cd ios
open HelpEmApp.xcodeproj

# 2. In Xcode:
# - Select "Any iOS Device (arm64)" as destination
# - Product → Archive (or Cmd+B)
# - Wait for build to complete (2-3 minutes)

# 3. In Organizer (auto-opens after archive):
# - Select your archive
# - Click "Distribute App"
# - Choose "App Store Connect"
# - Click "Upload"
# - Wait for upload to complete
```

### Submit to TestFlight

1. Go to https://appstoreconnect.apple.com
2. Navigate to: My Apps → helpem → TestFlight
3. Find your new build (usually appears in 5-10 minutes)
4. Add build to "Internal Testing" or "External Testing"
5. Add testers if needed
6. Click "Submit for Review" (if external testing)

**Build Info:**
- Version: 1.0 (or current version)
- Build: 15
- Release Notes: "Yellow dot fix + UAT improvements"

---

## Step 5: Smoke Test in Staging

### Web App Smoke Test

1. **Navigate to staging URL:**
   ```
   https://app.helpem.ai
   ```

2. **Test Authentication:**
   - Click "Sign In with Apple"
   - Complete authentication
   - Verify you land on main app page

3. **Test Voice Input:**
   - Click microphone button
   - Grant permissions if prompted
   - Say "Add milk to my grocery list"
   - Verify grocery item appears
   - **CRITICAL:** Release button → yellow dot disappears <1s

4. **Test CRUD Operations:**
   ```
   Create Todo: "Remind me to call mom"
   Create Appointment: "Dentist tomorrow at 2pm"
   Create Habit: "Meditate daily"
   Create Grocery: "Bread"
   ```

5. **Test Persistence:**
   - Refresh page (Cmd+R)
   - Verify all items still visible

6. **Test Deletion:**
   - Delete one item from each category
   - Verify confirmation dialogs work
   - Verify items are removed

**Expected Results:**
- ✅ All items created successfully
- ✅ All items persist after refresh
- ✅ All items can be deleted
- ✅ No console errors

---

### iOS App Smoke Test (via TestFlight)

1. **Install from TestFlight:**
   - Open TestFlight app on iPhone
   - Find "helpem" app
   - Click "Install"
   - Wait for download

2. **Launch App:**
   - Open helpem from home screen
   - Sign in with Apple
   - Grant microphone permissions

3. **Test Yellow Dot Fix:**
   ```
   1. Press and hold microphone button
   2. Verify yellow dot appears (top right)
   3. Say "Test message"
   4. Release button
   5. Yellow dot should disappear in <1 second
   ```

4. **Test App Backgrounding:**
   ```
   1. Press and hold microphone button
   2. Yellow dot appears
   3. Swipe up to home screen (don't release button)
   4. Yellow dot should disappear immediately
   ```

5. **Test Voice Commands:**
   - "Add milk to grocery list"
   - "Remind me to call dad"
   - "Schedule dentist tomorrow at 2pm"
   - Verify all items appear in web app

**Expected Results:**
- ✅ Yellow dot disappears <1s on release
- ✅ Yellow dot disappears immediately on app background
- ✅ All voice commands create items
- ✅ Items sync to web app

---

## Step 6: Monitor for Errors

### Vercel Logs

```bash
# View real-time logs
vercel logs --follow

# Or in Vercel dashboard:
# 1. Go to your deployment
# 2. Click "Logs" tab
# 3. Watch for errors (red lines)
```

**Watch for:**
- 401 Unauthorized errors
- Database connection errors
- OpenAI API errors
- Rate limit warnings

---

### Railway Logs

```bash
# View logs via Railway CLI
railway logs

# Or in Railway dashboard:
# 1. Go to your project
# 2. Click "Deployments"
# 3. Click latest deployment
# 4. View logs
```

**Watch for:**
- Database connection errors
- Query errors
- Migration failures

---

## Step 7: Performance Check

### Test Response Times

```bash
# Test API endpoints
curl -w "@curl-format.txt" -o /dev/null -s "https://app.helpem.ai/api/todos"

# Or use browser DevTools:
# 1. Open Network tab
# 2. Make a request
# 3. Check timing
```

**Acceptable response times:**
- `/api/todos` GET: <200ms
- `/api/appointments` GET: <200ms
- `/api/chat` POST: <2000ms (AI processing)
- `/api/groceries` GET: <200ms

---

## Step 8: Database Backup

### Create Manual Backup (Recommended)

```bash
# Via Railway CLI
railway backup create

# Or via Railway dashboard:
# 1. Go to Database service
# 2. Click "Backups"
# 3. Click "Create Backup"
# 4. Wait for completion
```

**Why:** Safety net in case something goes wrong

---

## Rollback Procedure (If Needed)

### Rollback Web App

```bash
# Via Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "..." menu
# 4. Click "Promote to Production"

# Via Vercel CLI:
vercel rollback [deployment-url]
```

### Rollback Database

```bash
# Via Railway:
# 1. Go to Backups
# 2. Find backup before deployment
# 3. Click "Restore"
# 4. Confirm restoration
```

### Rollback iOS

No rollback needed - TestFlight users can:
1. Go to TestFlight
2. Select older build
3. Click "Install"

---

## Post-Deployment Checklist

### Immediate (within 5 minutes)
- [ ] Web app loads without errors
- [ ] Authentication works
- [ ] Voice input works
- [ ] Database queries succeed
- [ ] No errors in Vercel logs
- [ ] No errors in Railway logs

### Within 1 hour
- [ ] Create test data in each category
- [ ] Verify persistence after refresh
- [ ] Test all CRUD operations
- [ ] Monitor error logs
- [ ] Check performance metrics

### Within 24 hours
- [ ] Monitor user feedback
- [ ] Check error rates
- [ ] Verify no memory leaks (iOS)
- [ ] Confirm rate limits working
- [ ] Review usage analytics

---

## Success Criteria

### Web App
- ✅ Deployment status: "Ready"
- ✅ No 5xx errors in logs
- ✅ All API endpoints responding <2s
- ✅ Database queries successful
- ✅ Authentication working
- ✅ No console errors in browser

### iOS App
- ✅ Build uploaded to TestFlight
- ✅ Yellow dot disappears <1s
- ✅ Voice input working
- ✅ Permissions flow correct
- ✅ No crash reports
- ✅ Memory stable

### Database
- ✅ All tables exist
- ✅ Indexes created
- ✅ Foreign keys working
- ✅ Backup completed
- ✅ No orphaned records

---

## Monitoring Dashboards

### Vercel
- Analytics: https://vercel.com/your-org/helpem-web/analytics
- Logs: https://vercel.com/your-org/helpem-web/logs
- Deployments: https://vercel.com/your-org/helpem-web/deployments

### Railway
- Dashboard: https://railway.app/project/your-project
- Database Metrics: Check CPU, memory, connections
- Logs: Real-time log streaming

### Apple
- TestFlight: https://appstoreconnect.apple.com/apps/testflight
- Crash Reports: Analytics → Crashes
- User Feedback: TestFlight Feedback

---

## Troubleshooting Common Issues

### Issue: "Unauthorized" errors on API calls

**Cause:** JWT_SECRET mismatch or missing Authorization header

**Fix:**
1. Verify JWT_SECRET in Vercel matches backend
2. Check browser localStorage for session token
3. Try signing out and back in

---

### Issue: Groceries not persisting

**Cause:** Table doesn't exist or foreign key error

**Fix:**
```sql
-- Connect to Railway database
psql "your-connection-string"

-- Run verification
\i migrations/verify_groceries_table.sql

-- Check for orphaned records
SELECT COUNT(*) FROM groceries 
WHERE user_id NOT IN (SELECT id FROM users);
```

---

### Issue: Yellow dot not disappearing

**Cause:** iOS build not using Build 15 code

**Fix:**
1. Verify build number in TestFlight
2. Ensure latest code was archived
3. Clean build folder in Xcode (Shift+Cmd+K)
4. Archive again

---

### Issue: High response times (>5s)

**Cause:** Database connection pool exhausted or OpenAI API slow

**Fix:**
1. Check Railway database metrics
2. Verify connection pool settings
3. Check OpenAI API status
4. Review slow query logs

---

## Support Contacts

**Deployment Issues:**
- Vercel Support: https://vercel.com/support
- Railway Support: https://railway.app/help

**Apple/TestFlight:**
- App Store Connect Help: https://developer.apple.com/support/

**Database:**
- Postgres Documentation: https://www.postgresql.org/docs/

---

## Next Steps After Staging

Once staging is stable (24-48 hours):

1. **Run Full Manual UAT**
   - Use COMPLETE_UAT_CHECKLIST.md
   - Test all 30 scenarios
   - Document any issues

2. **Gather Feedback**
   - Share TestFlight with testers
   - Monitor feedback in TestFlight
   - Track issues in GitHub

3. **Performance Tuning**
   - Review slow queries
   - Optimize indexes if needed
   - Adjust rate limits based on usage

4. **Prepare for Production**
   - Remove debug logging
   - Update version numbers
   - Prepare release notes

---

## 🎉 Deployment Complete!

Once all smoke tests pass, you're live on staging! 

**Monitor for 24-48 hours before promoting to production.**

Good luck! 🚀
