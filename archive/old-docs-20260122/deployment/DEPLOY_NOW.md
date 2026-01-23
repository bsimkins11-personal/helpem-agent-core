# Deploy Now - Complete Deployment Guide

**Date:** January 19, 2026  
**Status:** Ready to Deploy  
**Commit:** `98e66a4` - "Complete beta strategy & pricing updates"

---

## ✅ Pre-Deployment Checklist

### Git Status
- [x] All changes committed
- [x] Pushed to GitHub (`origin/main`)
- [x] 41 files changed, 14,797 insertions
- [x] Safe to switch computers

### What's Being Deployed

**Web App:**
- Updated pricing tiers (Free/Basic/Premium)
- Premium voice free on all tiers
- 7-day trial messaging
- Updated FAQs
- Sticky chat input
- TTS-optimized agent instructions

**iOS App:**
- TTS voice quality optimization
- Premium voice selection (Zoe)
- Audio session improvements
- Background cleanup improvements

**Backend:**
- No code changes (database already has all tables)
- Agent instructions updated for voice-first output

---

## 🚀 Deployment Order

### 1. Backend (Railway) - Deploy First
### 2. Web (Vercel) - Deploy Second  
### 3. iOS (TestFlight) - Deploy Last

---

## 1️⃣ Backend Deployment (Railway)

### Current Status
```bash
# Check if backend needs deployment
# (No code changes, but agent instructions updated in web app)
```

### Railway Deploy
```bash
# Railway auto-deploys from main branch
# Verify at: https://railway.app/project/[your-project-id]
```

### Health Check
```bash
# After deploy completes:
curl https://[your-railway-url]/health

# Expected: {"status": "ok"}
```

### Test Database
```bash
# Verify all tables exist:
node backend/scripts/checkDatabase.js

# Or use SQL script:
psql $DATABASE_URL -f migrations/verify_all_tables.sql
```

**Status:** ✅ Backend ready (no code changes needed)

---

## 2️⃣ Web Deployment (Vercel)

### Changes Being Deployed
- `web/src/app/pricing/page.tsx` - Updated tiers
- `web/src/app/page.tsx` - Updated FAQs
- `web/src/components/ChatInput.tsx` - Sticky input
- `web/src/lib/agentInstructions.ts` - Voice-first output

### Vercel Deploy

**Option A: Auto-Deploy (Recommended)**
```bash
# Vercel auto-deploys from main branch
# Check status: https://vercel.com/[your-account]/helpem-web
```

**Option B: Manual Deploy**
```bash
cd web
vercel --prod
```

### Environment Variables (Verify on Vercel)
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_API_URL=https://[your-railway-url]
JWT_SECRET=...
```

### Test After Deploy
```bash
# 1. Visit pricing page
open https://helpem.ai/pricing

# 2. Check Free tier shows "Premium voice (Zoe/Neural)"
# 3. Check 7-day trial messaging
# 4. Check FAQs updated

# 5. Test chat functionality
open https://helpem.ai/app

# 6. Test sticky input (scroll down, click Type button)
# 7. Test voice response quality
```

**Expected Results:**
- ✅ Pricing page shows updated tiers
- ✅ Premium voice listed on all tiers
- ✅ 7-day trial CTAs on paid plans
- ✅ Sticky input works (fixed on scroll)
- ✅ Chat works normally

---

## 3️⃣ iOS Deployment (TestFlight)

### Changes Being Deployed
- `ios/HelpEmApp/WebViewContainer.swift` - TTS optimization

### Build & Upload to TestFlight

**Step 1: Increment Build Number**
```
1. Open Xcode
2. Select HelpEmApp target
3. Go to General tab
4. Increment Version or Build:
   - Version: 1.0.0 (keep)
   - Build: [increment by 1, e.g., 5 → 6]
```

**Step 2: Archive & Upload**
```
1. Product > Archive
2. Wait for build to complete
3. Distribute App > App Store Connect
4. Upload
5. Wait for processing (~5-10 minutes)
```

**Step 3: Configure TestFlight**
```
1. Go to App Store Connect
2. TestFlight tab
3. Select new build
4. Add "What's New in This Version":

   Premium Voice & Support Updates

   ✨ NEW:
   - Premium Neural voice (Zoe) for all users
   - Optimized speech pacing and audio quality
   - Sticky chat input (fixed on scroll)
   - Auto-scroll to chat on input focus

   🐛 FIXES:
   - Improved audio session management
   - Better background app handling
   - Voice-optimized AI responses

   💡 SUPPORT:
   - New support email: support@helpem.ai
   - AI support available 24/7 in-app

5. Submit for Review (if needed)
6. Enable for External Testing
```

**Step 4: Notify Testers**
```
TestFlight will auto-notify testers when build is ready.

Or manually notify:
"New TestFlight build available!

Premium voice is now free for all users. 
Try it out and let us know what you think!

support@helpem.ai"
```

### Test on Device
```
1. Install from TestFlight
2. Test premium voice quality
3. Test sticky input
4. Test auto-scroll
5. Verify audio session cleanup (background app)
```

**Expected Results:**
- ✅ Premium voice (Zoe) speaks responses
- ✅ Natural pacing (rate 0.52)
- ✅ Sticky input stays fixed on scroll
- ✅ Auto-scroll works on input focus
- ✅ Audio stops when app backgrounds

---

## 🧪 Post-Deployment Testing

### Web App Tests

**1. Pricing Page**
```
✅ Free tier shows "Premium voice (Zoe/Neural)"
✅ Basic tier shows "$4.99/mo" and "Start 7-Day Free Trial"
✅ Premium tier shows "$9.99/mo" and "Start 7-Day Free Trial"
✅ Fair use disclaimer visible
✅ FAQ: "What's premium voice?" - says "All users get premium voice"
```

**2. Landing Page**
```
✅ FAQ updated with new pricing
✅ Premium voice explained as free
✅ iOS-only positioning clear
✅ support@helpem.ai in footer
```

**3. Chat Functionality**
```
✅ Sticky input (scroll down, input stays visible)
✅ Auto-scroll on "Type" button click
✅ Auto-scroll on "Hold to Talk" press
✅ Auto-scroll on text input focus
✅ AI responses optimized for voice (no code blocks in speech)
```

### iOS App Tests

**1. Voice Quality**
```
✅ Premium voice (Zoe) active
✅ Natural pacing (not too fast/slow)
✅ Clear pronunciation
✅ Proper audio session handling
```

**2. UI/UX**
```
✅ Sticky chat input works
✅ Auto-scroll on input interaction
✅ Smooth scrolling behavior
```

**3. Background Behavior**
```
✅ Audio stops when app backgrounds
✅ No lingering audio resources
✅ Clean app lifecycle
```

---

## 🔍 Monitoring

### Web (Vercel)
```
Monitor at: https://vercel.com/[account]/helpem-web/deployments

Watch for:
- Build errors
- Runtime errors
- Performance issues
```

### Backend (Railway)
```
Monitor at: https://railway.app/project/[id]

Watch for:
- High CPU usage
- Memory issues
- Database connection errors
```

### iOS (App Store Connect)
```
Monitor at: https://appstoreconnect.apple.com

Watch for:
- Crash reports
- User reviews
- TestFlight feedback
```

---

## 🚨 Rollback Plan

### If Web Deploy Fails
```bash
# Rollback to previous deployment in Vercel dashboard
# Or redeploy previous commit:
git revert HEAD
git push
```

### If iOS Build Fails
```
1. Check Xcode build errors
2. Fix issues
3. Rebuild and resubmit
4. Or: distribute previous build from TestFlight
```

### If Backend Issues Arise
```
# Railway auto-redeploy previous version
# Or manual rollback via Railway dashboard
```

---

## 📊 Success Metrics

### Immediate (Day 1)
- [ ] Pricing page shows updated tiers
- [ ] No build errors on any platform
- [ ] No increase in error rates
- [ ] TestFlight build available to testers

### Short-term (Week 1)
- [ ] Premium voice feedback positive
- [ ] Sticky input improves UX (less scrolling complaints)
- [ ] No voice-related bugs reported
- [ ] Support email (support@helpem.ai) receiving inquiries

### Medium-term (Month 1)
- [ ] Free tier users experiencing premium voice
- [ ] Conversion rate from Free → Basic/Premium
- [ ] Support AI handling 70-80% of inquiries
- [ ] No audio session issues reported

---

## 🔐 Environment Variables Checklist

### Vercel (Web)
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_API_URL=https://[railway-url]
JWT_SECRET=...
NODE_ENV=production
```

### Railway (Backend)
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
JWT_SECRET=...
PORT=8080
NODE_ENV=production
```

### iOS (Xcode)
```
(No environment variables - uses AppEnvironment.swift)

Verify in AppEnvironment.swift:
- webAppURL points to production (https://helpem.ai)
- apiBaseURL points to Railway backend
```

---

## 📞 Support Contacts

### If You Need Help

**Email:** support@helpem.ai  
**Vercel Support:** support@vercel.com  
**Railway Support:** support@railway.app  
**Apple Developer:** developer.apple.com/contact

---

## ✅ Final Checklist

### Before Deploying
- [x] All code committed and pushed to GitHub
- [x] Environment variables verified
- [x] Database tables verified (all exist)
- [x] Documentation complete

### During Deployment
- [ ] Backend deployed (Railway auto-deploy)
- [ ] Web deployed (Vercel auto-deploy)
- [ ] iOS built and uploaded (TestFlight)

### After Deployment
- [ ] Test pricing page
- [ ] Test landing page FAQs
- [ ] Test chat sticky input
- [ ] Test iOS premium voice
- [ ] Monitor logs for errors
- [ ] Notify team/testers

---

## 🎯 Quick Deploy Commands

### Check Status
```bash
# Git status
git status

# Railway status
railway status

# Vercel status
vercel ls
```

### Manual Deploy (if needed)
```bash
# Web (Vercel)
cd web && vercel --prod

# Backend (Railway)
railway up

# iOS
# Use Xcode: Product > Archive > Distribute
```

---

## Summary

**Status:** ✅ Ready to Deploy

**What's Changing:**
1. Pricing tiers updated (premium voice free)
2. UI improvements (sticky input)
3. Voice quality optimization (iOS)
4. Support system (support@helpem.ai)

**Deployment Time:** ~30 minutes total
- Backend: ~5 min (auto-deploy)
- Web: ~5 min (auto-deploy)
- iOS: ~20 min (build + upload + processing)

**Risk:** Low (mostly documentation and UI updates)

---

**Ready to deploy!** 🚀

Start with: Check Railway and Vercel dashboards to confirm auto-deploys triggered.
