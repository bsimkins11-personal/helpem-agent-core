# 🧪 Test Tribes NOW - Debug Guide

## ⏰ Status: Vercel Deploying (ETA: 1 minute)

---

## 🔍 Quick Test (When Deployed)

### 1. Open Browser Console
1. Go to helpem.ai
2. Press F12 (or Cmd+Option+J)
3. Go to **Console** tab

### 2. Check for Debug Logs
You should see:
```
🔐 Tribes: Token exists? true/false
🌐 Fetching tribes from: /api/tribes
📡 Tribes API response status: 200
✅ Tribes data received: {tribes: Array(7)}
📊 Number of tribes: 7
```

### 3. If You See Errors

**"Token exists? false"**
- Sign out and back in
- Check: `localStorage.getItem('helpem_session')`

**"API response status: 401"**
- Session expired, sign in again

**"API response status: 500"**
- Backend error, check Network tab
- Copy full error message

**No logs at all**
- Page isn't loading
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## 🔧 Manual API Test

### Test the API proxy directly:

1. **Get your session token:**
```javascript
// Run in browser console
localStorage.getItem('helpem_session')
```

2. **Test the API:**
```javascript
// Run in browser console
const token = localStorage.getItem('helpem_session');
fetch('/api/tribes', {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('Tribes:', data))
  .catch(e => console.error('Error:', e));
```

### Expected Response:
```json
{
  "tribes": [
    {
      "id": "uuid",
      "name": "Yoga Tribe",
      "memberCount": 5,
      "unreadMessageCount": 0,
      "pendingProposalsCount": 1,
      "lastMessage": {...},
      "isOwner": true
    }
  ]
}
```

---

## ✅ What Was Fixed

### Issue #1: API Mismatch
- ❌ Homescreen called: `${NEXT_PUBLIC_API_URL}/tribes` (direct backend)
- ❌ Menu called: `/api/tribes` (Next.js proxy)
- ✅ Now both use: `/api/tribes` (consistent!)

### Issue #2: Type Mismatch
- ❌ Backend returned: `pendingProposalsCount`
- ❌ Frontend expected: `pendingProposals`
- ✅ Fixed all frontend pages

### Issue #3: Prisma Error
- ❌ Tried to include non-existent `user` relation
- ✅ Removed invalid include

---

## 📋 Checklist

After Vercel deploys:
- [ ] Homescreen shows Tribes module
- [ ] 7 tribes visible in list
- [ ] Click tribe → goes to inbox
- [ ] Menu → Tribes works
- [ ] No console errors

If ANY fail, share:
1. Console logs (copy all)
2. Network tab → /api/tribes request/response
3. Any error messages

---

## 🚀 Deployment Status

Check: https://vercel.com/bryan-simkins/helpem-agent-core-web

Or run:
```bash
cd /Users/avpuser/HelpEm_POC
vercel ls | head -5
```

---

Last Updated: Just now
Next: Wait for Vercel build → Test in browser → Report results
