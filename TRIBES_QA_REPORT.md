# Tribes QA Report - Homescreen & Menu

## ✅ Backend Status

### Database Verification
```
Total Tribes: 7
- Yoga Tribe (5 members, has messages) ✅
- Beach Crew (5 members, has messages) ✅
- Blvd Burger (5 members, has messages) ✅
- Norayne (3 instances, 1 member each)
- Test tribe (1 member)
```

### API Endpoints
| Endpoint | Status | Purpose |
|----------|--------|---------|
| `GET /debug/tribes` | ✅ Working | Debug - no auth required |
| `GET /tribes` | ✅ Fixed | Main endpoint - requires auth |

### Recent Fixes
1. ❌ **Prisma Validation Error** - FIXED
   - Issue: Tried to include non-existent `user` relation on `TribeMessage`
   - Fix: Removed invalid `include`, use `getUserDisplayName(userId)` instead
   - Impact: Was breaking ALL tribe API calls

2. ✅ **API Response Format** - UPDATED
   - Added `memberCount`
   - Added `unreadMessageCount` (last 7 days)
   - Added `pendingProposalsCount`
   - Added `lastMessage` with text, sender, timestamp

---

## 📱 Frontend Status

### Homescreen Tribes Module

**What's Implemented:**
```typescript
interface Tribe {
  id: string;
  name: string;
  memberCount?: number;
  unreadMessageCount?: number;
  lastMessage?: {
    text: string;
    senderName?: string;
    timestamp: string;
  };
  pendingProposalsCount?: number;
}
```

**UI Features:**
- 💬 Unread message count badge (purple)
- 📋 Pending proposal count badge (amber)
- 🔴 Total notification badge (red)
- 💭 Last message preview
- ⚡ Quick action buttons ("View messages", "Review proposals")
- 🎨 Visual urgency (highlighted cards when action needed)
- 📊 Member count display
- 🔄 Expand/collapse module

**Console Debug Logs Added:**
```javascript
console.log("🔐 Tribes: Token exists?", !!token);
console.log("🌐 Fetching tribes from:", url);
console.log("📡 Tribes API response status:", res.status);
console.log("✅ Tribes data received:", data);
console.log("📊 Number of tribes:", data.tribes?.length || 0);
```

---

## 🧪 QA Test Plan

### Test 1: Backend API
```bash
# Test debug endpoint (no auth)
curl https://api-production-2989.up.railway.app/debug/tribes

# Expected: JSON with 7 tribes, demo tribes have messages
```

### Test 2: Browser Console
1. Open app at helpem.ai
2. Open Console (F12)
3. Look for debug logs:
   - `🔐 Tribes: Token exists?` - Should be `true`
   - `📡 Tribes API response status:` - Should be `200`
   - `✅ Tribes data received:` - Should show tribe array
   - `📊 Number of tribes:` - Should be `7`

### Test 3: Homescreen Display
- [ ] Tribes module visible on homescreen
- [ ] Expand/collapse works
- [ ] Shows 7 tribes
- [ ] Demo tribes show:
  - [ ] Yoga Tribe: 5 members
  - [ ] Beach Crew: 5 members  
  - [ ] Blvd Burger: 5 members
- [ ] Message counts display (if any unread)
- [ ] Proposal counts display (if pending)
- [ ] Last message preview shows (if exists)
- [ ] Click tribe → navigates to tribe inbox

### Test 4: Menu Tribes
- [ ] Menu "Tribes" option works
- [ ] Shows list of tribes
- [ ] Can navigate to each tribe

---

## 🐛 Known Issues & Status

### Issue #1: Tribes Not Showing on Homescreen
**Status:** 🔧 DEBUGGING  
**Possible Causes:**
1. ~~Prisma validation error~~ ✅ FIXED
2. ~~Missing API data fields~~ ✅ FIXED
3. ⏳ Frontend not receiving data
4. ⏳ Session token not being sent

**Next Steps:**
1. Check browser console for debug logs
2. Verify session token exists in localStorage
3. Check Network tab for `/tribes` request
4. Check response data structure

### Issue #2: Menu Tribes Broken
**Status:** 🔧 LINKED TO ISSUE #1  
**Cause:** Same Prisma error affected all tribe endpoints  
**Fix:** Same fix should resolve both

---

## 📊 Current Deployment Status

| Component | Status | Last Deploy | Version |
|-----------|--------|-------------|---------|
| Backend (Railway) | ✅ Running | 2min ago | Latest (Prisma fix) |
| Frontend (Vercel) | ✅ Ready | 3min ago | Latest (debug logs) |
| Database | ✅ Healthy | - | 7 tribes, 24 synthetic users |

---

## 🔍 Debugging Checklist

If tribes still not showing:

### Backend
- [ ] Railway logs show no errors
- [ ] `GET /tribes` returns 200 status
- [ ] Response includes all required fields

### Frontend  
- [ ] Session token exists: `localStorage.getItem('helpem_session')`
- [ ] API URL correct: `process.env.NEXT_PUBLIC_API_URL`
- [ ] Network request succeeds (check DevTools Network tab)
- [ ] Console shows debug logs
- [ ] No TypeScript/build errors

### Data Flow
```
Browser Storage → Session Token → 
API Request /tribes → Backend Query → 
Prisma → PostgreSQL → 
Response with Data → 
Frontend setState → 
Render Tribes Module
```

---

## 📝 Test Script

Run QA test:
```bash
./test-tribes-api.sh
```

Manual auth test:
```bash
# Get token from browser console
TOKEN=$(echo "paste token here")

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://api-production-2989.up.railway.app/tribes | jq .
```

---

## 🎯 Success Criteria

✅ **Backend:**
- `/tribes` API returns 200
- Response includes all 7 tribes
- Each tribe has memberCount, unreadMessageCount, pendingProposalsCount
- Demo tribes show correct data

✅ **Frontend:**
- Homescreen shows Tribes module
- All 7 tribes display
- Message/proposal counts visible
- Click navigation works
- No console errors

✅ **Menu:**
- Tribes menu option works
- Shows tribe list
- Navigation functional

---

Last Updated: 2026-01-23 06:55 UTC
Status: 🔧 In Progress - Awaiting Browser Console Verification
