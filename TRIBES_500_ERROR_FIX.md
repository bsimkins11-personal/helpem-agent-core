# Tribes 500 Error - Diagnosis & Fix

**Error:** "Failed to load resource: the server responded with a status of 500 ()"  
**Date:** January 23, 2026

---

## ✅ What's Working

- ✅ Tribes exist in database (3 tribes with 4 members each)
- ✅ Backend logic works (tested successfully)
- ✅ Permissions exist for all members
- ✅ getUserTribes() returns correct data
- ✅ Backend health check: OK

---

## ❌ The Issue

The `/api/tribes` endpoint is returning a 500 error even though:
- Tribes are in the database
- Backend queries work in isolation
- All data structures are correct

**Most likely causes:**
1. Error in `getUserDisplayName()` when processing last messages
2. Missing user data for synthetic users
3. Error in async mapping/processing

---

## 🔧 Quick Fix

Since the backend logic works in isolation but fails in the API, the issue is likely in the message processing or display name lookup.

**Temporary workaround:** Access tribes directly via:
- `/tribe/inbox` page
- `/tribe/settings` page

These pages don't rely on the main tribes API listing.

---

## 🧪 What I Tested

```bash
# Direct database query - Works ✅
SELECT * FROM tribes WHERE deleted_at IS NULL;
# Returns: 3 tribes

# getUserTribes() function - Works ✅
node test-tribes-endpoint.js
# Returns: 3 tribes with all data

# API endpoint - Fails ❌
curl https://app.helpem.ai/api/tribes
# Returns: 500 error
```

---

## 🔍 Next Debug Steps

1. **Check Railway logs** for the actual error:
   ```bash
   railway logs --environment production
   ```

2. **Test with a simpler response**:
   - Temporarily simplify the tribes endpoint
   - Remove message/display name logic
   - Return just basic tribe data

3. **Check getUserDisplayName**:
   - Might fail for synthetic users
   - Might timeout or error

---

## 💡 Solution Options

### Option 1: Simplify Tribes Response (Quick)
Remove the "last message" logic temporarily:
```javascript
// Don't fetch last message for now
lastMessage: null
```

### Option 2: Fix getUserDisplayName (Proper)
Ensure it handles synthetic users properly:
```javascript
export async function getUserDisplayName(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { appleUserId: true }
    });
    
    // For synthetic users, extract name from apple_user_id
    if (user?.appleUserId?.startsWith('demo-')) {
      const name = user.appleUserId.split('-')[1];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    return user?.appleUserId || 'Unknown';
  } catch (error) {
    console.error('Error getting display name:', error);
    return 'Unknown';
  }
}
```

### Option 3: Access Tribes Directly (Workaround)
Navigate to:
- `https://app.helpem.ai/tribe/inbox`
- `https://app.helpem.ai/tribe/settings`

---

## 📱 Current Status

**Database:** ✅ 3 tribes created successfully  
**Backend Logic:** ✅ Works in isolation  
**API Endpoint:** ❌ Returns 500 error  
**Root Cause:** TBD - need Railway logs

---

**Next:** Check Railway logs to see the actual error message
