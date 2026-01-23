# Tribe Feature Implementation Summary

## Overview
The Tribe feature enables users to coordinate tasks, routines, appointments, and groceries with trusted groups of people. It follows a proposal-based model where items are invitations that must be explicitly accepted, ensuring no social pressure and maintaining user autonomy.

## Core Product Invariants (Non-Negotiable)

1. **Proposals, Not Assignments**: All tribe items are proposals that require explicit acceptance
2. **No Social Pressure**: No visibility into acceptance status, no reminders, no analytics impact
3. **One Notification Per Proposal**: Recipients get notified once when a proposal is created
4. **Silent Deletion**: Users can ALWAYS delete items from their personal lists without notifying the tribe or the person who added them
5. **User Autonomy**: Users maintain full control over their personal space
6. **Clear Context**: Visual distinction between personal items (blue) and tribe items (green)

## Architecture

### Database Schema

#### Core Models
- **Tribe**: Groups of users coordinating together
- **TribeMember**: Membership with acceptance tracking
- **TribeMemberPermissions**: Controls what members can add/remove in the tribe
- **TribeMemberPersonalItemPermissions**: Controls what the tribe can do to a member's personal items
- **TribeItem**: Items shared within a tribe (tasks, routines, appointments, groceries)
- **TribeProposal**: Invitations sent to specific members
- **TribeMemberRequest**: Requests from non-owners to add members
- **TribeActivity**: Coordination events feed (not chat)
- **TribeMessage**: Chat messages between tribe members

#### Personal Item Tracking
All personal items (Appointments, Todos, Habits, GroceryItems) include:
- `addedByTribeId`: UUID of the tribe that added the item
- `addedByTribeName`: Display name of the tribe

This allows users to see which tribe added items to their personal lists.

## Feature Set

### 1. Tribe Management

#### Create Tribe
- **Endpoint**: `POST /tribes`
- **Access**: Authenticated users
- **Behavior**: Creator becomes owner, auto-accepted as first member
- **Response**: Returns tribe with `isOwner`, `pendingProposals`, `joinedAt`

#### List Tribes
- **Endpoint**: `GET /tribes`
- **Returns**: All tribes user belongs to with pending proposal counts
- **Format**: Includes owner status and join date

#### Rename Tribe
- **Endpoint**: `PATCH /tribes/:tribeId`
- **Access**: Owner only
- **Behavior**: Updates tribe name

#### Delete Tribe
- **Endpoint**: `DELETE /tribes/:tribeId`
- **Access**: Owner only
- **Behavior**: Soft delete (sets `deletedAt`), creates activity log

### 2. Member Management

#### Add Members
- **Endpoint**: `POST /tribes/:tribeId/members`
- **Owner Behavior**: Directly adds member with optional custom permissions
- **Member Behavior**: Creates a `TribeMemberRequest` for owner approval
- **Permissions**: Can specify CRUD permissions per category when adding

#### Member Requests
- **List Requests**: `GET /tribes/:tribeId/member-requests`
  - Owners see all pending requests
  - Members see only their own requests
- **Approve Request**: `POST /tribes/:tribeId/member-requests/:requestId/approve`
  - Owner can approve with optional custom permissions
  - Creates member and updates request state
- **Deny Request**: `POST /tribes/:tribeId/member-requests/:requestId/deny`
  - Owner can deny requests

#### Update Member Settings
- **Endpoint**: `PATCH /tribes/:tribeId/members/:memberId`
- **Self-Update**: Members can update their own notification preferences and management scope
- **Owner-Update**: Owners can update other members' permissions (not themselves)
- **Permissions**: Uses upsert to create if missing

#### Leave Tribe
- **Endpoint**: `POST /tribes/:tribeId/leave`
- **Behavior**: Sets `leftAt` timestamp, member can be re-invited

### 3. Permissions System

#### Tribe Member Permissions
Controls what a member can do **within the tribe**:
- `canAddTasks`, `canRemoveTasks`
- `canAddRoutines`, `canRemoveRoutines`
- `canAddAppointments`, `canRemoveAppointments`
- `canAddGroceries`, `canRemoveGroceries`

**Default**: Can add all, cannot remove (except owner)

#### Personal Item Permissions
Controls what the tribe can do **to a member's personal items**:
- `tribeCanAddToMyAppointments`, `tribeCanRemoveFromMyAppointments`, `tribeCanUpdateMyAppointments`
- `tribeCanAddToMyTodos`, `tribeCanRemoveFromMyTodos`, `tribeCanUpdateMyTodos`
- `tribeCanAddToMyRoutines`, `tribeCanRemoveFromMyRoutines`, `tribeCanUpdateMyRoutines`
- `tribeCanAddToMyGroceries`, `tribeCanRemoveFromMyGroceries`, `tribeCanUpdateMyGroceries`

**Default**: All false (tribe cannot modify personal items unless explicitly granted)

**Critical Rule**: Users ALWAYS have the right to delete items from their personal lists, regardless of permissions. Deletions are silent.

### 4. Proposals System

#### Create Proposal
- **Endpoint**: `POST /tribes/:tribeId/items`
- **Behavior**: Creates a `TribeItem` and `TribeProposal` for each recipient
- **State**: Starts as "proposed"
- **Notification**: One notification per proposal creation

#### Accept Proposal
- **Endpoint**: `POST /tribes/:tribeId/proposals/:proposalId/accept`
- **Behavior**: 
  - Updates proposal state to "accepted"
  - If `managementScope` is "shared_and_personal", adds to user's personal list
  - Creates activity log entry

#### Not Now
- **Endpoint**: `POST /tribes/:tribeId/proposals/:proposalId/not-now`
- **Behavior**: Marks proposal as "not_now", keeps in inbox

#### Dismiss Proposal
- **Endpoint**: `DELETE /tribes/:tribeId/proposals/:proposalId`
- **Behavior**: Removes proposal from inbox

### 5. Messaging System

#### Send Message
- **Endpoint**: `POST /tribes/:tribeId/messages`
- **Access**: Tribe members only
- **Behavior**: Creates message, no notifications sent
- **Validation**: Max 2000 characters

#### Get Messages
- **Endpoint**: `GET /tribes/:tribeId/messages`
- **Query Params**: `limit` (default 50), `before` (date for pagination)
- **Returns**: Messages ordered by creation date (oldest first for chat UI)

#### Edit Message
- **Endpoint**: `PATCH /tribes/:tribeId/messages/:messageId`
- **Access**: Message sender only
- **Behavior**: Updates message and sets `editedAt` timestamp

#### Delete Message
- **Endpoint**: `DELETE /tribes/:tribeId/messages/:messageId`
- **Access**: Message sender only
- **Behavior**: Soft delete (sets `deletedAt`)

### 6. Activity Feed

#### System Events
- Member added/removed
- Member requests created/approved/denied
- Tribe deleted
- Created automatically, no user action required

#### Admin Announcements
- **Endpoint**: `POST /tribes/:tribeId/activities`
- **Access**: Owner only
- **Behavior**: Creates activity entry with type "ADMIN"
- **Validation**: Max 280 characters

#### Get Activities
- **Endpoint**: `GET /tribes/:tribeId/activities`
- **Returns**: Activity feed ordered by creation date

## User Flows

### Creating and Managing a Tribe

1. User taps "Manage Tribes" from menu
2. Taps "+" to create new tribe
3. Enters tribe name
4. Tribe is created, user is owner
5. User can:
   - Rename tribe (owner only)
   - Invite members (owner can directly add, members create requests)
   - Manage member permissions
   - View activity feed
   - Send messages
   - Delete tribe (owner only)

### Adding Members

#### Owner Flow
1. Navigate to Tribe → Members
2. Tap "+" to invite
3. Select contact from device contacts
4. Set initial permissions (optional)
5. Member is added directly (if user exists) or invitation sent

#### Member Flow
1. Navigate to Tribe → Members
2. Tap "+" to invite
3. Select contact
4. Request is created, pending owner approval
5. Owner receives request in member requests list
6. Owner can approve (with permissions) or deny

### Sharing Items

1. User creates item (task, routine, appointment, grocery)
2. User selects "Share with Tribe"
3. Selects tribe and recipients
4. Proposal created for each recipient
5. Recipients see proposal in their inbox
6. Recipients can:
   - Accept (adds to personal list if scope allows)
   - Mark "Not Now"
   - Dismiss

### Managing Personal Items Added by Tribe

1. User sees item in personal list with green tribe badge
2. Badge shows which tribe added it
3. User can:
   - Delete item (silent, no notification)
   - Edit item (if permissions allow)
   - View in context of tribe

## Privacy & Control Features

### Silent Deletion
- Users can delete any item from their personal lists
- No notifications sent to:
  - The tribe that added the item
  - The user who added the item
  - Any other tribe members
- Implemented via `personalItemDeletion.js` helper

### Management Scope
- **Only Shared Items** (default): Tribe items appear only in tribe context
- **Shared + Personal Items**: Tribe items also appear in personal lists
- User controls this per-tribe setting

### Personal Item Permissions
- Users control what tribes can do to their personal items
- Separate from tribe member permissions
- Can grant add/remove/update permissions per category
- Users always retain deletion rights

## UI/UX Features

### Visual Indicators
- **Tribe Badge**: Green badge on items showing which tribe added them
- **Owner Badge**: Orange "Owner" indicator in tribe list
- **Pending Count**: Muted badge showing pending proposals
- **Context Colors**: Blue for personal, green for tribe items

### Navigation Structure
- **Menu → Manage Tribes**: List all tribes, create new
- **Tribe Detail View**: Unified hub with sections for:
  - Messages
  - Inbox (proposals)
  - Shared Items
  - Members
  - Settings
- **Tribe Settings**: Accessible from menu or detail view

### Empty States
- Helpful messages explaining what each section is for
- Clear call-to-action buttons
- Visual icons for better understanding

## Technical Implementation

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Session token verification
- **Rate Limiting**: Applied to all tribe endpoints
- **Migrations**: Auto-run on server startup via `prestart` script

### Frontend (Web)
- **Framework**: Next.js with React
- **State Management**: Custom hooks and context
- **Styling**: Tailwind CSS
- **Real-time**: Polling for new messages (3-second interval)

### iOS App
- **Framework**: SwiftUI
- **Architecture**: MVVM pattern
- **API Client**: Centralized `TribeAPIClient` with error handling
- **Navigation**: NavigationStack with sheet presentations

## Security & Privacy

### Authentication
- All endpoints require valid session token
- User ID extracted from session
- No user input trusted for user identification

### Authorization
- Owner checks for sensitive operations
- Member verification for tribe access
- Permission validation before actions

### Data Privacy
- Silent deletion ensures no social friction
- No tracking of deletion events
- Personal items remain under user control

## Error Handling

### Backend
- Comprehensive error logging
- User-friendly error messages
- Specific error codes for different failure modes
- Graceful degradation (e.g., activity logging failures don't break flows)

### Frontend
- Error alerts with actionable messages
- Loading states for async operations
- Optimistic UI updates where appropriate
- Retry mechanisms for failed requests

## Performance Considerations

### Database
- Indexes on frequently queried fields:
  - `tribeId`, `userId` combinations
  - `createdAt` for time-based queries
  - `state` for proposal filtering

### API
- Parallel data loading where possible
- Pagination for message feeds
- Efficient queries with proper includes

### UI
- Memoization of expensive calculations
- Lazy loading of lists
- Debounced search inputs

## Future Enhancements (Not Yet Implemented)

1. **Real-time Messaging**: WebSocket support for instant message delivery
2. **Message Reactions**: Emoji reactions to messages
3. **File Attachments**: Share images/files in messages
4. **Tribe Templates**: Pre-configured permission sets
5. **Bulk Operations**: Add multiple members at once
6. **Tribe Analytics**: Usage statistics (owner only)
7. **Export Data**: Download tribe activity history

## Deployment

### Backend (Railway)
- Auto-deploys on git push
- Runs migrations via `prestart` script
- Environment variables for database connection
- Health check endpoint for monitoring

### Web (Vercel)
- Auto-deploys on git push
- Builds Next.js app
- Environment variables for API URL

### iOS (TestFlight/App Store)
- Manual deployment via Xcode
- Version management required
- App Store review process

## Testing Checklist

### Core Functionality
- [x] Create tribe
- [x] Add members (owner direct add)
- [x] Member requests (non-owner)
- [x] Approve/deny requests
- [x] Update permissions
- [x] Create proposals
- [x] Accept/decline proposals
- [x] Send/receive messages
- [x] Delete tribe
- [x] Leave tribe

### Permissions
- [x] Member permissions (tribe CRUD)
- [x] Personal item permissions
- [x] Owner vs member access control
- [x] Silent deletion verification

### Edge Cases
- [x] Duplicate member requests
- [x] Re-inviting left members
- [x] Editing own messages
- [x] Deleting own messages
- [x] Empty states
- [x] Error handling

## Known Limitations

1. **User Display Names**: Currently uses truncated user IDs, needs proper display name system
2. **Message Polling**: Web app polls every 3 seconds instead of WebSocket
3. **Contact Matching**: Relies on email/phone matching, no user search UI yet
4. **Migration Dependency**: Requires database connection to generate migrations

## Success Metrics

- Tribe creation rate
- Member addition rate
- Proposal acceptance rate
- Message engagement
- Feature adoption (permissions, management scope)
- Error rates
- User retention in tribes

---

**Last Updated**: January 2025
**Status**: Production Ready
**Version**: 1.0.0
