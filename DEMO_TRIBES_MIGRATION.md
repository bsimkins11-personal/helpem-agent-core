# Demo Tribes Migration & Cleanup

**Purpose:** Handle transition from old synthetic tribes to new demo tribes system

---

## Problem

Users might have:
1. Old synthetic tribes from previous seed scripts
2. Duplicate demo tribes from multiple seeds
3. Demo tribes mixed with real tribes

---

## Solution: Smart Demo Tribe Handling

### Auto-Seed Logic (Updated)

```javascript
// When user first logs in:
1. Check if user has ANY tribes
2. If YES:
   - Check if they're demo tribes (by name or synthetic members)
   - If demo tribes exist → Don't create duplicates
   - If real tribes exist → Don't add demos (user is already using real tribes)
3. If NO tribes:
   - Create 3 fresh demo tribes
```

### Result:
- ✅ No duplicate demo tribes
- ✅ Demo tribes only for truly new users
- ✅ Real tribes take precedence
- ✅ Clean, predictable state

---

## Cleanup Utilities

### Check Demo Tribes Status
```bash
GET /tribes/demo/cleanup/check
```

Returns:
```json
{
  "total": 5,
  "demo": 4,
  "real": 1,
  "demoTribes": [
    { "id": "...", "name": "🏠 My Family", "memberCount": 4 },
    { "id": "...", "name": "Demo Family", "memberCount": 3 }
  ],
  "realTribes": [
    { "id": "...", "name": "Actual Family", "memberCount": 2 }
  ],
  "needsCleanup": true
}
```

### Remove Duplicate Demo Tribes
```bash
POST /tribes/demo/cleanup/remove-duplicates
```

Keeps:
- 1 family demo tribe (newest)
- 1 work demo tribe (newest)
- 1 roommates demo tribe (newest)

Deletes:
- All other demo tribes with similar names

### Remove All Demo Tribes
```bash
POST /tribes/demo/cleanup/remove-all-demo
```

Use when:
- User creates their first real tribe
- You want to transition from demo to production

---

## Migration Strategy

### For Existing Users with Old Synthetic Tribes

**Option 1: Automatic Cleanup (Recommended)**

Run cleanup when user creates first real tribe:

```typescript
// After user creates real tribe
if (isFirstRealTribe) {
  await fetch('/api/tribes/demo/cleanup/remove-all-demo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

**Option 2: Banner Prompt**

Show banner when both demo and real tribes exist:

```tsx
{hasRealTribes && hasDemoTribes && (
  <div className="bg-blue-50 p-4 rounded-lg">
    <p>You have demo tribes and real tribes.</p>
    <button onClick={removeDemoTribes}>
      Clean up demo tribes
    </button>
  </div>
)}
```

**Option 3: Keep Both (Marked)**

Mark demo tribes in UI:

```tsx
{tribe.name.startsWith('🏠') && (
  <span className="text-xs bg-purple-100 px-2 py-1 rounded">
    Demo
  </span>
)}
```

---

## Implementation Status

### ✅ Completed

1. Smart duplicate prevention in seed endpoint
2. Check user has existing tribes before seeding
3. Skip demo creation if user has real tribes
4. Cleanup utilities endpoint

### 🎯 Next Steps

Choose migration strategy:
- [ ] Auto-cleanup when first real tribe created
- [ ] Banner prompt to clean up
- [ ] Keep both with "Demo" labels

**Recommended:** Auto-cleanup when first real tribe created (cleanest UX)

---

## Testing Scenarios

### Scenario 1: Brand New User
```
User signs in first time
→ Has 0 tribes
→ Demo seed creates 3 tribes ✅
→ User sees demo tribes with banner
```

### Scenario 2: User with Old Synthetic Tribes
```
User has 7 old synthetic tribes
→ Demo seed detects existing tribes
→ Skips creation ✅
→ User keeps old tribes
→ (Optional) Run cleanup to remove duplicates
```

### Scenario 3: User Creates First Real Tribe
```
User has 3 demo tribes
→ Creates "My Actual Family" tribe
→ Auto-cleanup removes demo tribes ✅
→ User now has only their real tribe
```

### Scenario 4: User Already Has Real Tribes
```
User already created real tribes before
→ Demo seed detects real tribes
→ Skips demo creation ✅
→ User never sees demo tribes (perfect!)
```

---

## Code Changes

### backend/routes/demo-tribes.js
- ✅ Check for existing tribes before seeding
- ✅ Identify demo vs real tribes
- ✅ Skip if real tribes exist

### backend/routes/demo-tribes-cleanup.js (NEW)
- ✅ Check demo tribes status
- ✅ Remove duplicates
- ✅ Remove all demo tribes

### backend/index.js
- ✅ Mount cleanup routes

---

## Deployment

```bash
# Already committed and pushed:
git log -1
# b2970fe Implement Demo Tribes for V1 launch

# This cleanup layer:
git add .
git commit -m "Add demo tribes cleanup & migration utilities"
git push origin main
```

---

**Status:** Ready to deploy cleanup utilities  
**Migration Strategy:** Choose option (recommend auto-cleanup)  
**Breaking Changes:** None (backwards compatible)
