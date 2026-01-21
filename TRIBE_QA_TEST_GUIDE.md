# Tribe Permission System - QA Test Guide

## Objective
Verify that Tribe owners have **full control** over what each member can CRUD (Create, Read, Update, Delete) at a per-user level.

## Test Prerequisites
- 2 test users (Owner and Member)
- Backend running with Tribe migration applied
- iOS app with Tribe UI integrated

---

## Test Case 1: Owner Can Set Per-Member Permissions

### Steps
1. **Owner**: Create a new Tribe called "Test Tribe"
2. **Owner**: Invite Member to the Tribe
3. **Member**: Accept the Tribe invitation
4. **Owner**: Navigate to Tribe → Settings → Members
5. **Owner**: Tap on Member in the list
6. **Owner**: Verify the "Member Permissions" section is visible
7. **Owner**: Verify all 8 permission toggles are shown:
   - Can Add Tasks (default: ON)
   - Can Remove Tasks (default: OFF)
   - Can Add Routines (default: ON)
   - Can Remove Routines (default: OFF)
   - Can Add Appointments (default: ON)
   - Can Remove Appointments (default: OFF)
   - Can Add Groceries (default: ON)
   - Can Remove Groceries (default: OFF)

### Expected Result
✅ All 8 permission toggles are visible and interactive
✅ Section header reads "Member Permissions"
✅ Footer text explains: "Control what this member can add or remove in the Tribe. Changes apply immediately after saving."

---

## Test Case 2: Disable Add Task Permission

### Steps
1. **Owner**: In Member Details, toggle OFF "Can Add Tasks"
2. **Owner**: Tap "Save Permissions" button
3. **Owner**: Wait for success alert
4. **Owner**: Verify success alert shows "Permissions updated successfully"
5. **Owner**: Tap OK to dismiss
6. **Owner**: Navigate back to Members list
7. **Owner**: Verify Member row shows "Add: 3/4 • Remove: 0/4"
8. **Member**: Try to create a Tribe item (task) and share with Tribe
9. **Member**: Select this Tribe and Owner as recipient
10. **Member**: Attempt to share

### Expected Result
✅ Success alert appears after saving
✅ Member list shows updated permission count
✅ Member receives error: "You don't have permission to add tasks in this Tribe"
✅ Task is NOT created as proposal

---

## Test Case 3: Enable Remove Task Permission

### Steps
1. **Owner**: Navigate back to Member Details
2. **Owner**: Toggle ON "Can Remove Tasks"
3. **Owner**: Tap "Save Permissions"
4. **Owner**: Wait for success alert
5. **Owner**: Verify Member row shows "Add: 3/4 • Remove: 1/4"
6. **Member**: Navigate to Tribe → Shared items
7. **Member**: Try to remove a shared task
8. **Member**: Verify action succeeds

### Expected Result
✅ Permission is saved successfully
✅ Member can now remove tasks
✅ API validates permission server-side

---

## Test Case 4: Disable All Permissions

### Steps
1. **Owner**: Navigate to Member Details
2. **Owner**: Toggle OFF all 8 permissions
3. **Owner**: Tap "Save Permissions"
4. **Owner**: Verify Member row shows "No permissions"
5. **Member**: Try to create any Tribe item
6. **Member**: Verify all attempts fail with permission error

### Expected Result
✅ Member list shows "No permissions"
✅ Member cannot add OR remove any items
✅ All API calls return 403 Forbidden with permission error

---

## Test Case 5: Enable All Permissions

### Steps
1. **Owner**: Navigate to Member Details
2. **Owner**: Toggle ON all 8 permissions
3. **Owner**: Tap "Save Permissions"
4. **Owner**: Verify Member row shows "Full permissions"
5. **Member**: Try to create and remove items of all types
6. **Member**: Verify all actions succeed

### Expected Result
✅ Member list shows "Full permissions"
✅ Member can add AND remove all item types
✅ Member effectively has same permissions as owner (except managing other members)

---

## Test Case 6: Grocery Permission Pluralization Bug

### Critical Test (This was broken before fix)

### Steps
1. **Owner**: Navigate to Member Details
2. **Owner**: Toggle OFF "Can Add Groceries"
3. **Owner**: Tap "Save Permissions"
4. **Member**: Try to create a grocery item and share with Tribe
5. **Member**: Verify error: "You don't have permission to add groceries in this Tribe"
6. **Owner**: Toggle ON "Can Add Groceries"
7. **Owner**: Save permissions
8. **Member**: Try again to create grocery item
9. **Member**: Verify it succeeds

### Expected Result
✅ Grocery permissions work correctly (was broken due to pluralization bug)
✅ Backend generates correct permission key: "canAddGroceries" (not "canAddGrocerys")

---

## Test Case 7: Member Cannot Change Own Permissions

### Steps
1. **Member**: Navigate to Tribe → Settings → Members
2. **Member**: Tap on self in member list
3. **Member**: Verify permission section shows: "Only the Tribe owner can manage member permissions"
4. **Member**: Verify no permission toggles are shown

### Expected Result
✅ Member cannot see or edit their own permissions
✅ Clear message explains only owner can manage permissions

---

## Test Case 8: Owner Cannot Edit Own Permissions

### Steps
1. **Owner**: Navigate to Tribe → Settings → Members
2. **Owner**: Tap on self in member list
3. **Owner**: Verify message: "Owners have full permissions for all categories"
4. **Owner**: Verify no permission toggles are shown

### Expected Result
✅ Owner permissions are always full and cannot be restricted
✅ No toggles shown for owner's own permissions

---

## Test Case 9: Backend Permission Validation

### API Test (Can use curl or Postman)

### Steps
1. Get Member's session token
2. Disable Member's "Can Add Tasks" permission
3. Make API call:
```bash
curl -X POST $API_URL/tribes/$TRIBE_ID/items \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemType": "task",
    "data": {"title": "Test Task"},
    "recipientUserIds": ["owner-id"]
  }'
```
4. Verify response: 403 Forbidden
5. Verify error message includes: "You don't have permission to add tasks in this Tribe"

### Expected Result
✅ Backend enforces permissions server-side
✅ Cannot bypass permission checks via direct API calls
✅ Error message is clear and actionable

---

## Test Case 10: Permission Persistence

### Steps
1. **Owner**: Set specific permissions for Member
2. **Owner**: Close app completely
3. **Owner**: Reopen app and navigate to Member Details
4. **Owner**: Verify all permission toggles match saved state
5. **Member**: Close and reopen app
6. **Member**: Try to perform actions based on permissions
7. **Member**: Verify permissions are still enforced correctly

### Expected Result
✅ Permissions persist across app restarts
✅ Backend database correctly stores permission state
✅ iOS correctly loads and displays saved permissions

---

## Success Criteria

All test cases must pass:
- ✅ Owner can set ALL 8 permissions per member
- ✅ Permissions are enforced server-side (cannot bypass)
- ✅ UI clearly shows permission state in member list
- ✅ Success/error feedback for all operations
- ✅ Grocery permissions work (pluralization fix)
- ✅ Members cannot edit own permissions
- ✅ Owners have immutable full permissions
- ✅ Permission persistence works correctly

---

## Automated Test Command

```bash
# Run permission validation
./validate-tribe-acceptance-criteria.sh

# Run permission key test
cd backend && node test-tribe-permissions.js
```

---

## Known Issues After QA
None. All critical issues have been resolved.

---

## Production Checklist

Before deploying to production:
- [ ] All 10 test cases pass
- [ ] Permission key test passes (all ✅)
- [ ] Validation script passes (38/38 checks)
- [ ] At least 2 real users have tested the flow
- [ ] Backend logs show no permission errors
- [ ] iOS UI is intuitive and clear

---

## Reporting Issues

If any test fails:
1. Note the exact step that failed
2. Capture error messages (backend logs + iOS console)
3. Document expected vs actual behavior
4. Report to development team with:
   - Test case number
   - User role (Owner/Member)
   - Device/platform details
   - Reproduction steps
