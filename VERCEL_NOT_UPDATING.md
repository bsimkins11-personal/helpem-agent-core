# 🚨 VERCEL NOT UPDATING - DIAGNOSIS & FIX

## Problem
You are manually deploying on Vercel but changes are NOT appearing on the live site.

## Diagnosis Steps

### Step 1: Verify Vercel Project Settings

1. Go to: https://vercel.com/dashboard
2. Click `helpem-poc` project
3. Click **Settings** (left sidebar)
4. Click **General** tab

**Check these settings:**
```
Root Directory: web
  OR
Root Directory: (empty/blank)

Framework Preset: Next.js

Build Command: npm run build
  OR
Build Command: cd web && npm run build

Output Directory: (leave default - usually .next)

Install Command: npm install
  OR  
Install Command: cd web && npm install
```

**CRITICAL:** If Root Directory is blank, build commands MUST have `cd web &&`

### Step 2: Check Deployment Logs

1. Go to Deployments tab
2. Click your latest deployment
3. Click **"Building"** or **"Logs"** tab
4. Look for errors:
   - ❌ "Build failed"
   - ❌ "Command not found"
   - ❌ "Module not found"
   - ✅ "Build completed"

**If you see errors, note them exactly.**

### Step 3: Verify Correct Code is Deployed

After deployment shows "Ready":

1. **Click deployment URL** (should be different from main URL)
   - Example: `helpem-poc-abc123.vercel.app`
   
2. **Test deployment preview URL directly**
   - Go to `/app` route on preview
   - Hard refresh (Cmd + Shift + R)
   - Does it show new changes?

**If preview works but production doesn't:**
- Production domain is cached
- Need to clear Vercel edge cache

### Step 4: Check Production Domain Assignment

1. Settings → Domains
2. Verify `helpem-poc.vercel.app` points to latest deployment
3. If showing old deployment, click "..." → "Make Production"

---

## Solutions (Try In Order)

### Solution 1: Clear Browser & Vercel Cache

1. **Incognito/Private window:**
   ```
   Open https://helpem-poc.vercel.app/app in incognito
   ```
   - If works here → browser cache issue
   - Clear all browser cache for helpem-poc.vercel.app

2. **Clear Vercel Edge Cache:**
   - Settings → General
   - Scroll to "Deployment Protection"
   - Click "Purge Cache"
   - Redeploy again

### Solution 2: Fix Root Directory

**Option A: Set Root Directory to `web`**
1. Settings → General
2. Root Directory: Enter `web`
3. Build Command: Change to `npm run build` (remove `cd web &&`)
4. Install Command: Change to `npm install` (remove `cd web &&`)
5. Save
6. Redeploy

**Option B: Keep Root Directory Empty**
1. Root Directory: Leave blank
2. Build Command: `cd web && npm run build`
3. Install Command: `cd web && npm install`
4. Output Directory: `web/.next`
5. Save
6. Redeploy

### Solution 3: Force New Deployment URL

Instead of redeploying existing deployment:

1. Make a tiny code change:
   ```bash
   cd /Users/avpuser/HelpEm_POC/web
   echo "// force rebuild $(date)" >> src/app/app/page.tsx
   cd ..
   git add web/src/app/app/page.tsx
   git commit -m "Force new deployment"
   git push origin main
   ```

2. This creates NEW deployment (not redeploy)
3. Wait for Vercel to auto-build
4. Check new preview URL

### Solution 4: Delete .vercel Folder & Re-link

**WARNING: Only do this if nothing else works**

```bash
cd /Users/avpuser/HelpEm_POC/web
rm -rf .vercel
vercel --prod
```

This re-links project and forces fresh deployment.

---

## Test If Deployment Actually Worked

After deployment shows "Ready", run these tests:

### Test 1: Check Source Code
```bash
curl https://helpem-poc.vercel.app/app | grep "calendarView"
```

**Expected:** Should find "calendarView" in HTML
**If not found:** Code not deployed

### Test 2: Check Build Date
1. View page source (Ctrl+U / Cmd+Option+U)
2. Look for `<script src="/_next/static/chunks/[hash].js"`
3. Hash should be NEW (different from before)
4. If same hash → not rebuilt

### Test 3: Direct API Test
```bash
curl -I https://helpem-poc.vercel.app/app
```

Check `x-vercel-cache` header:
- `MISS` = Fresh from server ✅
- `HIT` = Cached (old) ❌

---

## Common Root Causes

### 1. **Build Failing Silently**
- Vercel shows "Ready" but built wrong code
- Check deployment logs carefully

### 2. **Wrong Root Directory**
- Vercel building from project root (not `/web`)
- Finds wrong package.json or builds nothing

### 3. **CDN/Edge Cache**
- Vercel edge servers serving cached version
- Need cache purge

### 4. **Browser Service Worker**
- Next.js service worker caching old app
- Clear all site data

### 5. **Multiple Vercel Projects**
- Accidentally deploying to wrong project
- Check project name in dashboard

---

## Verification Checklist

After trying fixes, verify all of these:

- [ ] Deployment status = "Ready" (green)
- [ ] Deployment logs show "Build completed successfully"
- [ ] Preview URL shows new changes
- [ ] Production URL shows new changes (after 5 min)
- [ ] Incognito window shows new changes
- [ ] Hard refresh (Cmd+Shift+R) shows new changes

---

## If STILL Not Working

1. **Screenshot Vercel settings page** (General tab)
2. **Screenshot deployment logs** (full log)
3. **Screenshot the actual app** showing it's not updated
4. **Run this command and share output:**
   ```bash
   curl -sI https://helpem-poc.vercel.app/app | grep -E "cache|vercel-id|etag"
   ```

This will help diagnose the exact issue.

---

## Expected Changes (Once Working)

When calendar is expanded, you should see:

```
◷ Today                    < > [2 appts]  [Today]
─────────────────────────────────────────
[  Day  ] [ Week ] [ Month ]   ← These buttons
─────────────────────────────────────────
[Morning standup]  [X]
[Coffee with Sarah] [X]
```

Click Week → Shows "Jan 12 - Jan 18"
Click arrows → Navigate by week
X button → Delete with confirmation

---

**Bottom Line:** If manual deploy isn't working, something is wrong with Vercel project configuration or caching. Follow diagnostic steps above.
