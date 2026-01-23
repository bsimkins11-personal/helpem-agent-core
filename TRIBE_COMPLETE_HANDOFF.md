# Tribe Feature - Complete Handoff Document

**Date:** January 2025  
**Status:** ✅ Complete and Ready for UAT  
**Purpose:** Comprehensive summary of all Tribe functionality for handoff to next agent

---

## Table of Contents

1. [Overview](#overview)
2. [Product Invariants (Critical - Never Break)](#product-invariants-critical---never-break)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend API](#backend-api)
6. [iOS Implementation](#ios-implementation)
7. [Web Implementation](#web-implementation)
8. [Key Features](#key-features)
9. [Implementation Details](#implementation-details)
10. [Testing & Deployment](#testing--deployment)
11. [Known Issues & TODOs](#known-issues--todos)
12. [File Structure](#file-structure)

---

## Overview

**Tribe** is a coordination feature that allows users to:
- Create groups (tribes) with other users
- Share items (appointments, todos, habits, grocery lists) as **proposals** (not assignments)
- Coordinate without social pressure
- Maintain full autonomy over personal space

### Core Philosophy

**"Coordinate with my people without pressure, while keeping my personal space mine."**

- **Proposals, not assignments**: All tribe items require explicit acceptance
- **No social pressure**: No acceptance visibility, reminders, or analytics
- **Silent deletion**: Users can always delete tribe-added items without notification
- **Clear context**: Visual distinction between personal (blue) and tribe (green) items

---

## Product Invariants (Critical - Never Break)

### 1. Proposals, Not Assignments ✅
- **Explicit accept required**: All tribe items are proposals requiring explicit acceptance
- **No auto-add**: Items never automatically appear in personal lists
- **User choice**: Every proposal is a choice, not an obligation

### 2. No Social Pressure ✅
- ❌ **No acceptance visibility**: Other members cannot see who accepted/declined
- ❌ **No acceptance counts**: No "3 of 5 accepted" displays
- ❌ **No read receipts**: No indicators of who has seen proposals
- ❌ **No analytics tied to acceptance**: Acceptance rates not tracked or displayed
- ❌ **No reminders**: No push notifications or in-app nudges for pending proposals
- ❌ **No "X accepted" events**: Activity feed never shows acceptance events

### 3. One Notification Per Proposal (Idempotent) ✅
- **Single notification**: User receives exactly one notification when proposal is created
- **Idempotent**: Retries don't create duplicate notifications
- **No follow-ups**: No reminders or follow-up notifications

### 4. Silent Deletion ✅
- **Users can ALWAYS delete tribe-added personal items**
- **No notifications**: Deletion never triggers notifications to tribe or creator
- **No activity logs**: Deletion events not logged in activity feed
- **No re-adding**: Deleted items cannot be automatically re-added
- **User autonomy > tribe consistency**: User's right to delete trumps all permissions
- **Implementation**: Suppression list prevents reappearance on sync

### 5. Clear Context ✅
- **Personal items**: Blue color scheme
- **Tribe items**: Green color scheme + badge
- **Badge shows**: Which tribe added the item
- **Origin context**: Always clear where item came from

---

## Architecture

### Backend (Node.js + Express + Prisma + PostgreSQL)

**Location:** `/backend/`

**Key Components:**
- **Routes**: `backend/src/routes/tribe.js` - All tribe API endpoints
- **Permissions**: `backend/src/lib/tribePermissions.js` - Permission logic and proposal state management
- **Schema**: `backend/prisma/schema.prisma` - Database schema
- **Migrations**: `backend/prisma/migrations/` - Database migrations

**Architecture Pattern:**
- RESTful API with Express.js
- Prisma ORM for database access
- Session-based authentication
- Automatic migrations on startup

### iOS (SwiftUI)

**Location:** `/ios/HelpEmApp/`

**Key Components:**
- **Models**: `ios/HelpEmApp/Models/` - Data models
- **Views**: `ios/HelpEmApp/Views/Tribe/` - UI components
- **Services**: `ios/HelpEmApp/Services/TribeAPIClient.swift` - API client
- **ViewModels**: Embedded in views (following `@MainActor` pattern)

**Architecture Pattern:**
- MVVM with SwiftUI
- ViewModels are `@MainActor` and `ObservableObject`
- API client handles HTTP requests
- Local persistence via UserDefaults (SuppressedOrigin, PendingOperation)

### Web (React + TypeScript)

**Location:** `/frontend/` or `/src/`

**Key Components:**
- React components for displaying tribe information
- Integration with personal item views
- Visual indicators (badges, colors) for tribe items

---

## Database Schema

### Core Models

#### `Tribe`
- `id`: UUID (primary key)
- `name`: String
- `ownerId`: UUID (foreign key to User)
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### `TribeMember`
- `id`: UUID (primary key)
- `tribeId`: UUID (foreign key to Tribe)
- `userId`: UUID (foreign key to User)
- `role`: String ('owner' | 'member')
- `joinedAt`: DateTime
- `permissions`: JSON (tribe-space permissions)

#### `TribeMemberPermissions`
- `id`: UUID (primary key)
- `tribeMemberId`: UUID (foreign key to TribeMember)
- `canCreate`: Boolean
- `canEdit`: Boolean
- `canDelete`: Boolean
- `canInvite`: Boolean
- `category`: String ('appointments' | 'todos' | 'habits' | 'grocery')

#### `TribeMemberRequest`
- `id`: UUID (primary key)
- `tribeId`: UUID (foreign key to Tribe)
- `requesterId`: UUID (foreign key to User)
- `state`: String ('pending' | 'approved' | 'denied')
- `createdAt`: DateTime
- `permissions`: JSON (custom permissions if approved)

#### `TribeItem`
- `id`: UUID (primary key)
- `tribeId`: UUID (foreign key to Tribe)
- `creatorId`: UUID (foreign key to User)
- `itemType`: String ('appointment' | 'todo' | 'habit' | 'grocery')
- `data`: JSON (item data)
- `createdAt`: DateTime

#### `TribeProposal`
- `id`: UUID (primary key)
- `tribeItemId`: UUID (foreign key to TribeItem)
- `recipientId`: UUID (foreign key to User)
- `state`: String ('proposed' | 'accepted' | 'not_now' | 'dismissed')
- `idempotencyKey`: String (for deduplication)
- `createdAt`: DateTime
- `updatedAt`: DateTime

#### `TribeProposalAction`
- `id`: UUID (primary key)
- `proposalId`: UUID (foreign key to TribeProposal)
- `userId`: UUID (foreign key to User)
- `action`: String ('accept' | 'not_now' | 'dismiss')
- `idempotencyKey`: String (unique per user)
- `createdAt`: DateTime
- `@@unique([userId, idempotencyKey])` - Prevents duplicate actions

#### `TribeMessage`
- `id`: UUID (primary key)
- `tribeId`: UUID (foreign key to Tribe)
- `senderId`: UUID (foreign key to User)
- `content`: String
- `createdAt`: DateTime

#### `TribeActivity`
- `id`: UUID (primary key)
- `tribeId`: UUID (foreign key to Tribe)
- `actorId`: UUID (foreign key to User, nullable)
- `type`: String ('member_added' | 'member_removed' | 'item_created' | 'announcement')
- `data`: JSON
- `createdAt`: DateTime

#### `TribeActivityHiddenBy`
- `id`: UUID (primary key)
- `activityId`: UUID (foreign key to TribeActivity)
- `userId`: UUID (foreign key to User)
- `createdAt`: DateTime
- `@@unique([activityId, userId])` - One hidden state per user per activity

#### `TribeMemberPersonalItemPermissions`
- `id`: UUID (primary key)
- `tribeMemberId`: UUID (foreign key to TribeMember)
- `category`: String ('appointments' | 'todos' | 'habits' | 'grocery')
- `canCreate`: Boolean
- `canEdit`: Boolean
- `canDelete`: Boolean
- `managementScope`: String ('sharedOnly' | 'sharedAndPersonal')

### Personal Item Models (with Tribe Tracking)

All personal items (`Appointment`, `Todo`, `Habit`, `GroceryItem`) have:

- `addedByTribeId`: UUID (nullable) - Which tribe added this item
- `addedByTribeName`: String (nullable) - Tribe name for display
- `originTribeItemId`: UUID (nullable) - **REQUIRED** - Links back to original tribe item
- `originTribeProposalId`: UUID (nullable) - **REQUIRED** - Links back to proposal that created this

**Indexes:**
- `[userId, addedByTribeId]` - Fast lookup of tribe items
- `[userId, originTribeItemId]` - Fast lookup for suppression checks

---

## Backend API

### Base URL
- **Production**: `https://api-production-2989.up.railway.app`
- **Local**: `http://localhost:3000`

### Authentication
All endpoints require session token in `Authorization` header:
```
Authorization: Bearer <session_token>
```

### Endpoints

#### Tribe Management

**POST `/api/tribes`**
- Create a new tribe
- Body: `{ name: string, memberUserIds?: string[] }`
- Returns: `{ tribe: Tribe }`

**GET `/api/tribes`**
- Get all tribes for current user
- Returns: `{ tribes: Tribe[] }`

**GET `/api/tribes/:tribeId`**
- Get tribe details
- Returns: `{ tribe: Tribe }`

**PUT `/api/tribes/:tribeId`**
- Update tribe (owner only)
- Body: `{ name?: string }`
- Returns: `{ tribe: Tribe }`

**DELETE `/api/tribes/:tribeId`**
- Delete tribe (owner only)
- Returns: `{ success: true }`

#### Member Management

**POST `/api/tribes/:tribeId/members`**
- Add member (owner) or request to join (member)
- Body: `{ inviteeUserId: string, permissions?: PermissionsUpdate }`
- Returns: `{ member: TribeMember }` (owner) or `{ request: TribeMemberRequest }` (member)

**GET `/api/tribes/:tribeId/members`**
- Get all members
- Returns: `{ members: TribeMember[] }`

**GET `/api/tribes/:tribeId/members/requests`**
- Get pending member requests (owner only)
- Returns: `{ requests: TribeMemberRequest[] }`

**POST `/api/tribes/:tribeId/members/requests/:requestId/approve`**
- Approve member request (owner only)
- Body: `{ permissions?: PermissionsUpdate }`
- Returns: `{ member: TribeMember }`

**POST `/api/tribes/:tribeId/members/requests/:requestId/deny`**
- Deny member request (owner only)
- Returns: `{ success: true }`

**DELETE `/api/tribes/:tribeId/members/:memberId`**
- Remove member (owner only) or leave tribe (self)
- Returns: `{ success: true }`

#### Tribe Items

**POST `/api/tribes/:tribeId/items`**
- Create tribe item and proposals
- Body: `{ itemType: string, data: object, recipientUserIds: string[], idempotencyKey: string }`
- Returns: `{ item: TribeItem, proposals: TribeProposal[] }`

**GET `/api/tribes/:tribeId/items`**
- Get all tribe items
- Query: `?category=appointments|todos|habits|grocery`
- Returns: `{ items: TribeItem[] }`

**PUT `/api/tribes/:tribeId/items/:itemId`**
- Update tribe item
- Body: `{ data: object }`
- Returns: `{ item: TribeItem }`

**DELETE `/api/tribes/:tribeId/items/:itemId`**
- Delete tribe item
- Returns: `{ success: true }`

#### Proposals

**GET `/api/tribes/:tribeId/proposals`**
- Get proposals for current user
- Query: `?state=proposed|accepted|not_now|dismissed`
- Returns: `{ proposals: TribeProposal[] }`

**POST `/api/tribes/:tribeId/proposals/:proposalId/accept`**
- Accept proposal (creates personal item)
- Headers: `X-Idempotency-Key: <uuid>`
- Returns: `{ proposal: TribeProposal, personalItem: Appointment|Todo|Habit|GroceryItem }`

**POST `/api/tribes/:tribeId/proposals/:proposalId/not-now`**
- Mark proposal as "not now"
- Headers: `X-Idempotency-Key: <uuid>`
- Returns: `{ proposal: TribeProposal }`

**POST `/api/tribes/:tribeId/proposals/:proposalId/dismiss`**
- Dismiss proposal (permanent)
- Headers: `X-Idempotency-Key: <uuid>`
- Returns: `{ proposal: TribeProposal }`

#### Messaging

**GET `/api/tribes/:tribeId/messages`**
- Get tribe messages
- Query: `?limit=50&before=<messageId>`
- Returns: `{ messages: TribeMessage[] }`

**POST `/api/tribes/:tribeId/messages`**
- Send message
- Body: `{ content: string }`
- Returns: `{ message: TribeMessage }`

#### Activity

**GET `/api/tribes/:tribeId/activities`**
- Get tribe activity feed
- Query: `?limit=50&before=<activityId>`
- Returns: `{ activities: TribeActivity[] }`

**POST `/api/tribes/:tribeId/activities/:activityId/hide`**
- Hide activity for current user
- Returns: `{ success: true }`

**DELETE `/api/tribes/:tribeId/activities/:activityId/hide`**
- Unhide activity for current user
- Returns: `{ success: true }`

#### Personal Item Permissions

**GET `/api/tribes/:tribeId/members/:memberId/personal-permissions`**
- Get personal item permissions for member
- Returns: `{ permissions: TribeMemberPersonalItemPermissions[] }`

**PUT `/api/tribes/:tribeId/members/:memberId/personal-permissions`**
- Update personal item permissions (owner only)
- Body: `{ permissions: PermissionsUpdate[] }`
- Returns: `{ permissions: TribeMemberPersonalItemPermissions[] }`

---

## iOS Implementation

### Models

**Location:** `ios/HelpEmApp/Models/`

#### `TribeModels.swift`
- `Tribe`: Core tribe model
- `TribeMember`: Member with role and permissions
- `TribeItem`: Shared item in tribe
- `TribeProposal`: Proposal with state and idempotency
- `TribeMessage`: Chat message
- `TribeActivity`: Activity feed entry
- `TribeMemberRequest`: Member join request
- `PermissionsUpdate`: Permission configuration
- `ProposalActionRequest`: Proposal action with idempotency key

#### `PersonalItems.swift`
- `Appointment`, `Todo`, `Habit`, `GroceryItem`: Personal item models
- `PersonalItemWithOrigin`: Protocol for origin tracking
- All models include: `originTribeItemId`, `originTribeProposalId`, `addedByTribeId`, `addedByTribeName`

#### `PendingOperation.swift`
- `PendingOperation`: Tracks client-side operations for retry
- `PendingOperationManager`: Manages persistence and retry logic
- Used for: proposal actions (accept/not-now/dismiss)

#### `SuppressedOrigin.swift`
- `SuppressedOrigin`: Tracks deleted tribe items
- `SuppressionManager`: Manages suppression list
- Prevents deleted items from reappearing on sync

### Views

**Location:** `ios/HelpEmApp/Views/Tribe/`

#### `TribeListView.swift`
- Main tribe list view
- Shows all user's tribes
- Create tribe functionality
- Navigation to tribe detail

#### `TribeDetailView.swift`
- Hub view for single tribe
- Tabs: Inbox, Shared, Messages, Members, Settings
- Owns sync and data management
- Coordinates all subviews

#### `TribeInboxView.swift`
- Displays proposals
- Sections: "New" (proposed) and "Later" (not_now)
- Actions: Accept, Not Now, Dismiss
- Uses idempotency keys

#### `TribeSharedView.swift`
- Shows all tribe items (accepted proposals)
- Filtered by category
- Displays item details

#### `TribeMessagesView.swift`
- Chat interface for tribe
- Pull-to-refresh
- Foreground polling (10-20s) or push notifications
- Message bubbles with sender info

#### `TribeMembersListView.swift`
- Member list
- Shows roles and permissions
- Invite functionality (owner only)

#### `TribeSettingsView.swift`
- Tribe settings
- Rename tribe (owner only)
- Member management
- Category enable/disable
- Notification preferences
- Leave/Delete tribe

#### `ContactsPickerView.swift`
- Contact picker for member invitation
- Extracts email/phone from contacts
- Validates contact has identifier

#### `ShareWithTribeView.swift`
- Share personal item with tribe
- Select recipients
- Create proposal

### Services

**Location:** `ios/HelpEmApp/Services/`

#### `TribeAPIClient.swift`
- HTTP client for all tribe API calls
- Handles authentication
- JSON encoding/decoding
- Error handling
- Idempotency key headers

**Key Methods:**
- `getTribes()`: Get all tribes
- `createTribe(name:memberUserIds:)`: Create tribe
- `inviteMember(tribeId:userId:permissions:)`: Add member
- `getProposals(tribeId:state:)`: Get proposals
- `acceptProposal(tribeId:proposalId:idempotencyKey:)`: Accept proposal
- `notNowProposal(tribeId:proposalId:idempotencyKey:)`: Mark not now
- `dismissProposal(tribeId:proposalId:idempotencyKey:)`: Dismiss proposal
- `getTribeMessages(tribeId:limit:before:)`: Get messages
- `sendTribeMessage(tribeId:content:)`: Send message
- `getTribeActivities(tribeId:limit:before:)`: Get activities

#### `SilentDeletionHelper.swift`
- Helper for silent deletion
- Suppresses origins
- Checks suppression on sync
- Prevents reappearance

### ViewModels

**Pattern:** All ViewModels are `@MainActor` and `ObservableObject`

**Key ViewModels:**
- `TribeListViewModel`: Manages tribe list
- `TribeDetailViewModel`: Hub for tribe data and sync
- `TribeInboxViewModel`: Manages proposals
- `TribeSharedViewModel`: Manages shared items
- `TribeMessagesViewModel`: Manages messages
- `TribeMembersListViewModel`: Manages members
- `TribeSettingsViewModel`: Manages settings

**Responsibilities:**
- Fetch data from API
- Manage loading/error states
- Handle user actions
- Update UI state
- Coordinate with other ViewModels

---

## Web Implementation

### Components

**Location:** `frontend/src/components/` or `src/components/`

**Key Components:**
- Tribe badge indicators on personal items
- Color coding (blue = personal, green = tribe)
- Origin context display
- Tribe name badges

**Integration Points:**
- Personal item views show tribe origin
- Visual distinction maintained
- Badge shows which tribe added item

---

## Key Features

### 1. Origin Tracking ✅
- All personal items track `originTribeItemId` and `originTribeProposalId`
- Enables silent deletion protection
- Links personal items back to tribe source

### 2. Proposal Idempotency ✅
- Client generates `idempotencyKey` (UUID) for all proposal actions
- Backend deduplicates on `(userId, idempotencyKey)`
- Prevents duplicate proposals/actions on retry
- Survives app restarts via `PendingOperation`

### 3. Silent Deletion ✅
- Users can always delete tribe-added items
- No notifications to tribe
- Suppression list prevents reappearance
- `SuppressedOrigin` persists locally
- Sync filters out suppressed items

### 4. Activity Feed ✅
- Per-user hidden state (`TribeActivityHiddenBy`)
- Actor-neutral or creator-only events only
- No acceptance events (no social pressure)
- Hide/unhide functionality

### 5. Messaging ✅
- Tribe chat interface
- Pull-to-refresh
- Foreground polling (10-20s) or push notifications
- Message history

### 6. Member Management ✅
- Owner can directly add members
- Members can request to join
- Owner approves/denies requests
- Custom permissions on add/approve

### 7. Personal Item Permissions ✅
- Control what tribe can do to personal items
- Per-category permissions (appointments, todos, habits, grocery)
- Management scope (sharedOnly vs sharedAndPersonal)
- Owner configurable

### 8. Inbox Organization ✅
- "New" section (proposed state)
- "Later" section (not_now state)
- Clear visual distinction
- Easy actions (accept/not-now/dismiss)

---

## Implementation Details

### Proposal State Machine

```
proposed → accepted (creates personal item)
proposed → not_now (moves to "Later" section)
proposed → dismissed (permanent removal)
not_now → accepted (user changes mind)
not_now → dismissed (permanent removal)
```

### Idempotency Flow

1. **Client generates `idempotencyKey`** (UUID) for action
2. **Client sends request** with `X-Idempotency-Key` header
3. **Backend checks** `TribeProposalAction` table for existing action
4. **If exists**: Return existing result (no duplicate)
5. **If new**: Process action, create `TribeProposalAction` record
6. **Client persists** `PendingOperation` for retry on failure

### Silent Deletion Flow

1. **User deletes** tribe-added personal item
2. **Immediate deletion** (optimistic UI)
3. **Persist `SuppressedOrigin`** with `originTribeItemId`
4. **On sync**: Check if incoming item matches suppressed origin
5. **If matches**: Ignore (don't add back)
6. **Suppression is permanent** (never expires)

### Sync Strategy

- **Hub ViewModel** (`TribeDetailViewModel`) owns sync
- **Subviews request refresh** from hub (no independent polling)
- **Pull-to-refresh** available in all views
- **Foreground polling** for messages (10-20s intervals)
- **Push notifications** preferred for messages (future)

### Error Handling

- **API errors**: `TribeAPIError` enum in iOS
- **Network errors**: Retry with exponential backoff
- **Idempotency errors**: Return existing result
- **Permission errors**: Clear error messages
- **Validation errors**: User-friendly messages

---

## Testing & Deployment

### Database Migrations

**Location:** `backend/prisma/migrations/`

**Migrations:**
1. **008**: Tribe messaging + origin tracking
2. **009**: Activity hidden state
3. **010**: Idempotency tracking

**Auto-run on startup:** Backend runs `prisma migrate deploy` automatically

### Deployment Status

**Backend (Railway):**
- ✅ Auto-deploying on push
- ✅ Migrations run automatically
- ✅ Prisma Client generated
- ✅ All endpoints ready

**Web (Vercel):**
- ✅ Auto-deploying on push
- ✅ No breaking changes

**iOS:**
- ✅ All compilation errors fixed
- ✅ Ready for Xcode build
- ✅ Ready for TestFlight

### Testing Checklist

See `UAT_DEPLOYMENT_CHECKLIST.md` for complete testing guide.

**Critical Paths:**
- ✅ Create tribe
- ✅ Add members (owner direct add)
- ✅ Request to join (member request)
- ✅ Approve/deny requests
- ✅ Create tribe item
- ✅ Accept proposal (creates personal item)
- ✅ Not-now proposal
- ✅ Dismiss proposal
- ✅ Delete tribe-added personal item (silent)
- ✅ Verify suppression (item doesn't reappear)
- ✅ Send/receive messages
- ✅ View activity feed
- ✅ Hide/unhide activity
- ✅ Update permissions

---

## Known Issues & TODOs

### Known Limitations (Acceptable for UAT)

1. **User Display Names**
   - Currently using truncated user IDs
   - Backend doesn't have display name field yet
   - **Status:** Acceptable for UAT

2. **Unread Message Count**
   - Placeholder (0) in TribeDetailView
   - Messaging is new feature
   - **Status:** Acceptable for UAT

3. **API/Repository/SyncEngine Split**
   - Architectural refactor deferred
   - Current implementation works correctly
   - **Status:** Can be done incrementally

### Future Improvements

1. **Push Notifications**
   - Implement for new messages
   - Reduce polling overhead
   - Better battery efficiency

2. **User Display Names**
   - Add to User model
   - Update all views
   - Better UX

3. **Offline Support**
   - Cache tribe data locally
   - Queue operations offline
   - Sync on reconnect

4. **Performance Optimizations**
   - Pagination for large lists
   - Virtual scrolling
   - Image caching

---

## File Structure

### Backend

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/             # Database migrations
│       ├── 008_.../
│       ├── 009_.../
│       └── 010_.../
└── src/
    ├── routes/
    │   └── tribe.js            # All tribe API endpoints
    └── lib/
        └── tribePermissions.js # Permission logic
```

### iOS

```
ios/HelpEmApp/
├── Models/
│   ├── TribeModels.swift      # Core tribe models
│   ├── PersonalItems.swift    # Personal items with origin tracking
│   ├── PendingOperation.swift # Idempotency tracking
│   └── SuppressedOrigin.swift # Silent deletion tracking
├── Views/Tribe/
│   ├── TribeListView.swift
│   ├── TribeDetailView.swift
│   ├── TribeInboxView.swift
│   ├── TribeSharedView.swift
│   ├── TribeMessagesView.swift
│   ├── TribeMembersView.swift
│   ├── TribeSettingsView.swift
│   ├── ContactsPickerView.swift
│   └── ShareWithTribeView.swift
└── Services/
    ├── TribeAPIClient.swift    # API client
    └── SilentDeletionHelper.swift
```

### Web

```
frontend/src/ or src/
└── components/
    └── [Tribe-related components for displaying origin]
```

---

## Documentation References

1. **TRIBE_REFACTOR_COMPLETE.md** - Implementation summary
2. **ios/TRIBE_STANDALONE_AGENT_SPEC.md** - iOS architecture spec
3. **ios/TRIBE_ACTIVITY_UX_SPEC.md** - Activity UX specification
4. **UAT_DEPLOYMENT_CHECKLIST.md** - Testing guide
5. **FINAL_DEPLOYMENT_STATUS.md** - Deployment status

---

## Quick Reference

### Critical Invariants (Never Break)
1. ✅ Proposals, not assignments
2. ✅ No social pressure
3. ✅ One notification per proposal
4. ✅ Silent deletion
5. ✅ Clear context

### Key Models
- `Tribe`, `TribeMember`, `TribeItem`, `TribeProposal`
- `TribeProposalAction` (idempotency)
- `SuppressedOrigin` (silent deletion)
- Personal items with origin tracking

### Key Endpoints
- `POST /api/tribes/:tribeId/items` - Create item + proposals
- `POST /api/tribes/:tribeId/proposals/:proposalId/accept` - Accept (with idempotency)
- `GET /api/tribes/:tribeId/proposals` - Get proposals
- `GET /api/tribes/:tribeId/messages` - Get messages
- `GET /api/tribes/:tribeId/activities` - Get activity

### Key iOS Files
- `TribeAPIClient.swift` - API client
- `TribeDetailView.swift` - Hub view
- `TribeInboxView.swift` - Proposals
- `PendingOperation.swift` - Idempotency
- `SuppressedOrigin.swift` - Silent deletion

---

**Status:** ✅ Complete and Ready for UAT  
**Last Updated:** January 2025  
**Next Agent:** Use this document as reference for all Tribe functionality
