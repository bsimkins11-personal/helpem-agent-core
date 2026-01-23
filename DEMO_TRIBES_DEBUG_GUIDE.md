# Demo Tribes Not Showing - Debug Guide

**Issue:** User opens app, no demo tribes appear  
**Date:** January 23, 2026

---

## ✅ What's Been Fixed

1. ✅ Backend routes deployed
2. ✅ Frontend auto-seed logic in place  
3. ✅ Database cleaned (user has 0 tribes)
4. ✅ Synthetic users created
5. ✅ No permission errors in backend code

---

## 🔍 Why Demo Tribes Might Not Show

### Reason 1: Frontend Not Calling Auto-Seed
**Check:** Are you on the `/app` page?  
**Location:** Demo tribes auto-seed only triggers on `/app` page  
**Not triggered on:** `/tribe/inbox`, `/tribe/settings`, other pages

**Fix:** Navigate to the main app page

### Reason 2: Session Token Issues
**Check:** Is user logged in?  
**Symptom:** Console shows "No session token"  
**Fix:** Sign in with Apple

### Reason 3: Auto-Seed Logic Skipping
**Check:** Console logs in browser  
**Look for:**
```
🔐 Tribes: Token exists? false  ← Problem!
```

**Or:**
```
📊 Number of tribes: 7  ← Old data still exists!
```

### Reason 4: API Errors
**Check:** Network tab in browser console  
**Look for:** Failed requests to `/api/tribes/demo/seed`  
**Status codes:**
- 401: Auth issue
- 500: Server error
- 404: Route not found

---

## 🧪 How to Debug on Device

### Step 1: Use Safari Developer Tools

**On Device:**
1. Settings → Safari → Advanced → Enable "Web Inspector"
2. Connect device to Mac via USB
3. Open Safari on Mac
4. Develop menu → [Your Device] → [HelpEm]

**On Mac:**
1. Safari will show the web inspector
2. Go to Console tab
3. Watch for logs when you open the app

### Step 2: Check Console Logs

**Look for these logs:**
```
🔐 Tribes: Token exists? true  ← Good!
🌐 Fetching tribes from: /api/tribes
📡 Tribes API response status: 200
✅ Tribes data received: {tribes: []}
📊 Number of tribes: 0
🎬 No tribes found, seeding demo tribes...  ← Seed should trigger here
```

**If seed succeeds:**
```
✅ Demo tribes created: {count: 3, ...}
```

**If seed fails:**
```
❌ Demo seed failed
```

### Step 3: Check Network Requests

**In Network tab, look for:**
1. `GET /api/tribes` - Should return `{tribes: []}`
2. `POST /api/tribes/demo/seed` - Should return `{count: 3, ...}`
3. `GET /api/tribes` (second call) - Should return 3 tribes

---

## 🔧 Manual Fixes

### Fix 1: Clear App Data
1. Kill app completely
2. Delete and reinstall (if needed)
3. Sign in fresh

### Fix 2: Test in Web Browser
1. Open https://app.helpem.ai/app in Safari
2. Sign in with Apple
3. Open Console (Cmd+Opt+J)
4. Watch for logs

**If it works in browser but not app:**
- Problem is with iOS app WebView
- Check if app is using old cache

### Fix 3: Database Manual Check
```sql
-- Check if user has tribes
SELECT COUNT(*) 
FROM tribe_members tm
JOIN tribes t ON tm.tribe_id = t.id
WHERE tm.user_id = 'YOUR_USER_ID' 
  AND tm.left_at IS NULL 
  AND t.deleted_at IS NULL;
-- Should be: 0
```

### Fix 4: Force Create Demo Tribes
**Last resort - create them manually:**

```bash
# On your Mac
cd /Users/avpuser/HelpEm_POC
./trigger-seed-direct.sh
```

This creates synthetic users so the auto-seed will work.

---

## 📱 Expected User Flow

### Normal Flow:
```
1. User opens app
   ↓
2. App loads /app page
   ↓
3. useEffect runs, calls loadTribes()
   ↓
4. GET /api/tribes → Returns {tribes: []}
   ↓
5. Detects 0 tribes
   ↓
6. POST /api/tribes/demo/seed
   ↓
7. Backend creates 3 demo tribes
   ↓
8. Returns {count: 3, tribes: [...]}
   ↓
9. App reloads tribes
   ↓
10. GET /api/tribes → Returns 3 tribes
   ↓
11. setTribes([...3 tribes...])
   ↓
12. UI shows "My Tribes" section with 3 tribes
```

---

## 🚨 Common Issues & Solutions

### Issue: "User already has tribes"
**Symptom:** Seed returns `{skipped: true}`  
**Cause:** Old tribes still in database  
**Fix:**
```sql
DELETE FROM tribe_members WHERE user_id = 'USER_ID';
```

### Issue: "Invalid session token"
**Symptom:** All API calls return 401  
**Cause:** Not logged in or token expired  
**Fix:** Sign in with Apple again

### Issue: "Demo tribes created but not showing"
**Symptom:** Backend returns success but UI empty  
**Cause:** Frontend not reloading after seed  
**Fix:** Check if `setTribes()` is being called after seed

### Issue: Synthetic users missing
**Symptom:** Backend error creating tribes  
**Cause:** Demo users don't exist in DB  
**Fix:** Run `./trigger-seed-direct.sh` to create them

---

## ✅ Verification Checklist

Before testing again:
- [ ] User has 0 tribes in database
- [ ] User has 0 tribe memberships
- [ ] Synthetic users exist (9 users with apple_user_id like 'demo-%')
- [ ] Backend is deployed (latest commit)
- [ ] Frontend is deployed (latest commit)
- [ ] User can sign in successfully
- [ ] User is on `/app` page (not `/tribe/inbox`)

---

## 🔍 What to Send Me for Debug

If still not working, send:
1. **Console logs** (full output from browser console)
2. **Network tab** (screenshot of API requests)
3. **What you see** (screenshot of tribes section)
4. **User ID** (from database or logs)
5. **Which page** (URL you're on)

---

## 📊 Quick Status Check

**Run this to see current state:**
```bash
cd /Users/avpuser/HelpEm_POC
source web/.env

echo "Synthetic users:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users WHERE apple_user_id LIKE 'demo-%';"

echo "User tribes:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM tribe_members WHERE user_id = '99db43e7-6cd1-4c0d-81b1-06c192cf8d42' AND left_at IS NULL;"

echo "Active tribes:"
psql "$DATABASE_URL" -c "SELECT name FROM tribes WHERE deleted_at IS NULL;"
```

---

**Status:** Database is clean, synthetic users created, ready for auto-seed  
**Next:** Open app on device and check console logs
