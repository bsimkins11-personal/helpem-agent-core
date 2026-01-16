# ⚠️ MANUAL DEPLOYMENT REQUIRED

## Problem
Vercel is NOT deploying the latest code automatically. The changes are committed to GitHub but not appearing on the live site.

## Latest Changes (Not Deployed Yet)
1. ✅ Calendar navigation arrows (prev/next day)
2. ✅ Delete appointment button with confirmation modal
3. ✅ Mobile-visible delete button

## Required Steps to Deploy

### Option 1: Redeploy from Vercel Dashboard (RECOMMENDED)

1. **Go to Vercel Dashboard:**
   https://vercel.com/dashboard

2. **Find Project:** `helpem-poc`

3. **Click on Project** → **Deployments Tab**

4. **Find Latest Deployment** (should be from a few minutes ago)

5. **Click "..." menu** → **"Redeploy"**

6. **CRITICAL: Uncheck "Use existing Build Cache"** ⚠️
   - This forces a clean build with latest code

7. **Click "Redeploy"** button

8. **Wait 2-3 minutes** for deployment to complete

9. **Hard refresh browser:**
   - Mac: Cmd + Shift + R
   - Windows: Ctrl + Shift + R

---

### Option 2: Check Project Settings

If redeployment doesn't work, check settings:

1. **Go to Project Settings:**
   https://vercel.com/dashboard → helpem-poc → Settings

2. **General Tab - Check:**
   - Root Directory: `web` ✅ (or empty)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Git Tab - Check:**
   - Production Branch: `main` ✅
   - Connected Repository: `helpem-agent-core` ✅

4. **If anything is wrong, fix it and redeploy**

---

### Option 3: Manual CLI Deploy (If Dashboard Fails)

```bash
cd /Users/avpuser/HelpEm_POC/web
npm install
npm run build
vercel --prod --force
```

**Note:** This requires Vercel CLI to be logged in. If you get a token error, run:
```bash
vercel login
```

---

## How to Verify Deployment Worked

1. **Check Vercel Dashboard:**
   - Deployment status should be "Ready" (green checkmark)
   - Click deployment → Should show latest commit hash

2. **Test Live Site:**
   ```bash
   # Should return "Previous day" and "Next day"
   curl https://helpem-poc.vercel.app/app | grep "Previous day"
   ```

3. **Test in Browser:**
   - Go to: https://helpem-poc.vercel.app/app
   - Hard refresh (Cmd + Shift + R)
   - Expand calendar → See prev/next arrows
   - Hover appointment → See X button

---

## Why Automatic Deployment Isn't Working

Possible causes:
1. Vercel build cache is stuck/corrupted
2. GitHub webhook not triggering Vercel
3. Root directory misconfigured
4. Build failing silently

**Solution:** Manual redeploy with clean cache (Option 1)

---

## iOS App (Separate Issue)

iOS app doesn't auto-update from Vercel. You must:

1. Rebuild app in Xcode every time web changes
2. The iOS app loads the web app in a WebView
3. WebView might cache old content

**To fix iOS:**
```bash
cd /Users/avpuser/HelpEm_POC
git pull origin main
# Open Xcode
# Product → Clean Build Folder
# Product → Build
# Product → Run
```

---

**BOTTOM LINE: You need to manually redeploy from Vercel dashboard with clean cache. Automatic deployments are not working.**
