# Tribe Type Feature Implementation

## Overview
Implemented tribe type distinction between "Friend" and "Family" tribes with different permission levels.

## Changes Made

### 1. Database Schema
**File:** `backend/prisma/schema.prisma`
- Added `tribeType` field to `Tribe` model
- Type: String with values 'friend' or 'family'
- **No default** - admin must explicitly choose when creating

**Migration:** `backend/migrations/add_tribe_type.sql`
- Adds `tribe_type` column
- Sets all existing tribes to 'friend' (as requested)
- Removes default constraint for future inserts

### 2. Backend API

**File:** `backend/src/routes/tribe.js`

#### POST /tribes (Create Tribe)
- Now requires `tribeType` in request body
- Validates type is either 'friend' or 'family'
- Returns error if not provided

#### GET /tribes (List Tribes)
- Returns `tribeType` for each tribe

#### PATCH /tribes/:tribeId (Update Tribe)
- Allows admins to change `tribeType`
- Only admins (owner) can change type
- Logs activity when type changes

#### POST /tribes/:tribeId/items (Create Tribe Item)
- **NEW VALIDATION**: Checks tribe type before allowing item creation
- **Friend tribes** - ONLY allow: `task`, `appointment`, `chat`
- **Family tribes** - Allow ALL types: `task`, `appointment`, `routine`, `grocery`, `chat`
- Returns clear error: "Friend tribes cannot share routines/groceries"

### 3. Frontend UI

**File:** `web/src/app/tribe/admin/page.tsx`

#### Create Tribe Form
- Added tribe type selector (required)
- Visual cards with icons:
  - 👥 Friend: "Appointments, todos, chat"
  - 👨‍👩‍👧‍👦 Family: "+ Routines & groceries"
- Form validation prevents submission without type selection

#### Tribe List Sidebar
- Shows tribe type icon next to name
- Displays "Friend • X members" or "Family • X members"

#### Settings Tab
- Added tribe type editor
- Visual selector matching create form
- "Save Tribe Type" button appears when changed
- Confirmation dialog explains the change
- Clear explanation of permissions for each type

## Permission Matrix

### Friend Tribes 👥
| Feature | Allowed |
|---------|---------|
| Appointments | ✅ Yes |
| Todos | ✅ Yes |
| Chat | ✅ Yes |
| Routines | ❌ No |
| Groceries | ❌ No |

### Family Tribes 👨‍👩‍👧‍👦
| Feature | Allowed |
|---------|---------|
| Appointments | ✅ Yes |
| Todos | ✅ Yes |
| Chat | ✅ Yes |
| Routines | ✅ Yes |
| Groceries | ✅ Yes |

## Rationale

**Friend Tribes are more restrictive:**
- Prevents awkward situations (friends adding to your grocery list)
- Maintains appropriate boundaries
- Routines are too personal/intimate for friend groups

**Family Tribes have full access:**
- Household coordination needs grocery lists
- Shared routines make sense (meal prep, exercise)
- More intimate relationship warrants full sharing

## Migration Strategy

1. ✅ All existing tribes set to 'friend' type
2. ✅ Admins can change to 'family' if needed
3. ✅ Future demo tribes will be deleted (already marked as 'friend')

## Testing Checklist

### Backend
- [ ] POST /tribes without tribeType → 400 error
- [ ] POST /tribes with 'friend' → creates friend tribe
- [ ] POST /tribes with 'family' → creates family tribe
- [ ] GET /tribes → returns tribeType for all tribes
- [ ] PATCH /tribes/:id with tribeType → updates type
- [ ] POST /tribes/:id/items with routine to friend tribe → 403 error
- [ ] POST /tribes/:id/items with routine to family tribe → success
- [ ] POST /tribes/:id/items with grocery to friend tribe → 403 error
- [ ] POST /tribes/:id/items with grocery to family tribe → success

### Frontend
- [ ] Create tribe form requires type selection
- [ ] Cannot submit without selecting type
- [ ] Tribe list shows correct icon (👥 or 👨‍👩‍👧‍👦)
- [ ] Settings tab shows current type
- [ ] Can change type and see confirmation
- [ ] After changing type, tribes list updates

### Integration
- [ ] Create friend tribe → try to share routine → see error
- [ ] Change tribe from friend to family → now can share routines
- [ ] Change tribe from family to friend → existing items stay, new routines blocked

## Next Steps

1. **Deploy backend** - Railway will apply migration automatically
2. **Deploy frontend** - Vercel will build with new UI
3. **Test on device** - Verify tribe type selection works
4. **Clean up demo tribes** - Delete them as planned

## Files Modified

- `backend/prisma/schema.prisma`
- `backend/migrations/add_tribe_type.sql`
- `backend/src/routes/tribe.js`
- `web/src/app/tribe/admin/page.tsx`
