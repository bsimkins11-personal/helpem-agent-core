# Invitation Messaging Guide

## Best Practices Applied

Our tribe invitation flow follows proven best practices for social app invitations:

### ✅ Personalization
- Shows who the invite is from (inviter's name)
- Addresses recipient by name (from contacts)
- Creates a personal connection

### ✅ Social Proof & FOMO
- Emphasizes collaboration: "excited to collaborate with you"
- Creates anticipation: "waiting for them when they join"
- Shows it's a special invitation, not spam

### ✅ Clear Value Proposition
- Explains what they're joining (the tribe name)
- Shows it's about working together
- Non-pushy: "they can choose to accept"

### ✅ Warm & Friendly Tone
- Uses emojis appropriately (🎉)
- Positive language throughout
- Excitement without being overwhelming

## Complete User Flow

### 1. Permission Request Screen

**Header:** "Invite Someone Special"

**Body:** "Choose someone to join your HelpEm tribe. They'll get a personal invitation from you when they sign up!"

**CTA:** "Continue"

**Footer:** "No background sync. No uploading contacts."

**Why it works:**
- "Someone Special" creates exclusivity
- "Personal invitation from you" emphasizes the relationship
- Privacy footer builds trust

### 2. Contact Selection

**Header:** "Choose Contact"

**Display:** Contact name and email/phone

**Footer:** "Your personal invitation will be waiting for them when they join HelpEm! They'll see it's from you and can choose to accept."

**Why it works:**
- "Personal invitation" repeated for emphasis
- "They'll see it's from you" creates accountability and warmth
- "Choose to accept" shows respect for their autonomy

### 3. Permissions Setup

Standard permission toggles with clear labels.

### 4. Success Confirmation

**Header:** "Invitation Ready! 🎉"

**Message:** "[Name] will see your personal invitation to join '[Tribe Name]' when they sign up for HelpEm. They'll be excited to collaborate with you!"

**CTA:** "Done"

**Why it works:**
- "Invitation Ready" (not "sent") - accurate since they're not a user yet
- Reinforces the personal connection
- "Excited to collaborate" creates positive anticipation
- Uses tribe name for context

### 5. Backend Activity Message

**Format:** "[Inviter Name] invited [Contact Name] to join the tribe! 🎉"

**Why it works:**
- Shows action in activity feed
- Celebrates the invite
- Creates social momentum in the tribe

### 6. Backend Response

**Message:** "[Contact Name] will receive a personal invitation from you to join the [Tribe Name] tribe when they sign up for HelpEm!"

**Why it works:**
- Confirms the action
- Reinforces personal connection
- Sets expectation (when they sign up)
- Uses tribe name for clarity

## Future: When Contact Signs Up

### Notification They'll Receive (Phase 2)

**Subject:** "You're invited to join [Tribe Name]!"

**Body:**
```
Hi [Contact Name]!

[Inviter Name] has invited you to join their HelpEm tribe called "[Tribe Name]".

HelpEm helps you and your tribe:
• Coordinate schedules
• Share tasks & routines  
• Collaborate on groceries
• Stay connected without the noise

[Inviter Name] is already using HelpEm and wants you to join their tribe. You'll be able to:
- See shared items they create for you
- Propose items to them
- Work together more seamlessly

Ready to join [Inviter Name]?

[Accept Invitation] [Learn More]

---
This invitation expires in [X] days.
```

**Why it will work:**
- Starts with who invited them (most important info)
- Explains what HelpEm is (they may not know)
- Shows specific benefits
- Emphasizes the relationship with inviter
- Clear CTAs
- Urgency with expiration

### In-App Welcome (Phase 2)

When they open the app after signing up:

**Modal:**
```
Welcome to HelpEm! 🎉

[Inviter Name] invited you to join "[Tribe Name]"

Would you like to join their tribe?

[Join Tribe] [Maybe Later]
```

**Why it will work:**
- Immediate recognition of the invite
- Simple yes/no choice
- Non-blocking (can dismiss)
- Celebrates the connection

## Technical Implementation

### Database Storage

**pending_tribe_invitations table:**
- Stores `inviter_name` for personalized messaging
- Stores `contact_name` for recognition
- Includes tribe context

### Backend Response

```json
{
  "success": true,
  "invitation": { ... },
  "inviterName": "John Smith",
  "message": "Sarah will receive a personal invitation from you..."
}
```

### iOS Models

```swift
struct PendingTribeInvitation {
    let inviterName: String?  // For future use in notifications
    let contactName: String?   // For confirmation messages
    // ... other fields
}
```

## A/B Testing Ideas (Future)

### Message Variants to Test

1. **Urgency:**
   - Current: "when they join"
   - Variant: "when they join in the next 30 days"

2. **Social Proof:**
   - Current: "excited to collaborate"
   - Variant: "[X] people are already in this tribe"

3. **Benefit Focus:**
   - Current: General collaboration
   - Variant: Specific use case (e.g., "coordinate family schedules")

### Metrics to Track

- Invitation acceptance rate
- Time from invite to signup
- Time from signup to acceptance
- Invites per user
- Retention of invited users vs organic signups

## Tone Guidelines

### Do's ✅
- Use "personal invitation" to emphasize relationship
- Show who the invite is from prominently
- Create anticipation without pressure
- Celebrate the connection
- Be specific about what they're joining
- Use emojis sparingly (🎉 for success moments)

### Don'ts ❌
- Don't say "request sent" (implies immediate delivery)
- Don't be vague about the inviter
- Don't oversell or hype excessively
- Don't hide the tribe name
- Don't create artificial urgency
- Don't use multiple emojis in one message

## Privacy & Trust

### What We Tell Users

1. **Permission Request:** "No background sync. No uploading contacts."
2. **Selection:** "One contact at a time"
3. **Confirmation:** "They can choose to accept"
4. **Transparency:** Shows exactly what info is shared

### What We Actually Do

✅ Only request permission when user initiates
✅ Only access the one selected contact
✅ Only store: email/phone, display name, inviter name
✅ Auto-expire after 30 days
✅ No background syncing ever

## Accessibility

- All messages have clear hierarchy (headers, body, CTAs)
- Emoji used as enhancement, not primary information
- Contact names and tribe names clearly labeled
- Action buttons have descriptive labels
- Success/error states clearly communicated

## Localization Considerations (Future)

Key strings to localize:
- "Invite Someone Special"
- "Personal invitation"
- "Join the HelpEm tribe"
- Success messages with name interpolation
- Tribe name should remain in original language

Cultural considerations:
- Some cultures may prefer more formal language
- Emoji usage varies by region
- "Excited" might not translate well everywhere
- Relationship emphasis may need adjustment

## Success Metrics

**Phase 1 (Current):**
- Contacts permission grant rate
- Invitations created per tribe
- User feedback on invitation flow

**Phase 2 (When email/SMS sent):**
- Invitation open rate
- Click-through to app store
- Signup rate from invites
- Acceptance rate after signup

**Phase 3 (Long-term):**
- Invited user retention vs organic
- Tribe activity for invited users
- Net Promoter Score for invitation experience
- Viral coefficient (invites per user)

## Conclusion

Our invitation flow balances:
- **Warmth** - Personal, friendly tone
- **Clarity** - Clear expectations and actions
- **Trust** - Transparent about privacy
- **Effectiveness** - Proven best practices

The inviter's name is central to every message, creating a personal connection that drives acceptance rates while maintaining user trust and platform integrity.
