# Demo Tribes - Setup Guide

## What This Creates

Three realistic demo tribes with synthetic users, messages, and proposals:

### 1. 🧘‍♀️ Yoga Tribe
**Members:** You + Sarah Chen, Emma Davis, Alex Kim, Casey Morgan

**Recent Messages:**
- Sarah: "Hey everyone! Don't forget we have class tomorrow at 7am 🧘‍♀️"
- Emma: "I'll be there! Should I bring extra mats?"
- Alex: "Yes please! Mine is getting worn out"
- Casey: "I might be 5 mins late, save me a spot!"
- Sarah: "No worries Casey, we start with breathing anyway 😊"

**Pending Proposals:**
- Saturday Morning Yoga appointment (Sarah → Emma, Alex)
  - 60 min class at Studio B
  - 2 days from now

### 2. 🏄‍♂️ Beach Crew
**Members:** You + Mike Johnson, Jordan Taylor, Jamie Rivera, Riley Parker

**Recent Messages:**
- Mike: "Surf's up this weekend! Who's in? 🏄‍♂️"
- Jordan: "Count me in! What time?"
- Jamie: "I'm bringing the cooler and snacks"
- Riley: "Early morning? Waves are better before noon"
- Mike: "Let's meet at 8am at the pier"
- Jordan: "Perfect! See you all there 🌊"

**Pending Proposals:**
- Beach trip grocery list (Mike → Jordan, Jamie, Riley)
  - Sunscreen SPF 50
  - Water bottles
  - Beach umbrella
  - Snacks

### 3. 🍔 Blvd Burger
**Members:** You + Emma Davis, Mike Johnson, Sarah Chen, Alex Kim

**Recent Messages:**
- Emma: "Who wants to try that new burger place on Boulevard? 🍔"
- Mike: "I'm always down for burgers!"
- Sarah: "They have vegan options too right?"
- Emma: "Yes! Impossible burger and veggie wraps"
- Alex: "Friday night? 7pm?"
- Emma: "Works for me! I'll make a reservation"
- Mike: "🎉 Can't wait!"

**Pending Proposals:**
- Blvd Burger Dinner appointment (Emma → Mike, Sarah, Alex)
  - 90 min dinner at Boulevard Burger Bar
  - 3 days from now
  - Topic: Try new menu items
- Bring cash for parking todo (Alex → Mike)

---

## How to Create Demo Tribes

### Step 1: Find Your User ID

**Option A: From iOS app logs**
```
Look for: "✅ Auth success: user=YOUR_USER_ID"
```

**Option B: From database**
```bash
psql $DATABASE_URL -c "SELECT id, apple_user_id FROM users ORDER BY last_active_at DESC LIMIT 5;"
```

Copy your user ID (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### Step 2: Run Seed Script

```bash
./seed-demo-tribes.sh YOUR_USER_ID
```

**Example:**
```bash
./seed-demo-tribes.sh "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Step 3: Refresh App

1. **iOS:** Pull down to refresh in tribe list
2. **Web:** Reload page
3. You should see 3 new tribes!

---

## What You Can Do with Demo Tribes

### Test Tribe Features:
- ✅ View messages from synthetic users
- ✅ Accept/decline proposals
- ✅ Send your own messages
- ✅ Invite real users to demo tribes
- ✅ Test tribe permissions
- ✅ Practice using tribe features

### Test Unread Badges:
- ✅ Close app
- ✅ Synthetic users "send" messages (via script)
- ✅ Reopen app → See unread badges
- ✅ Open tribe → Badge clears

### Test Daily Notifications:
- ✅ Leave tribes unopened
- ✅ Next day at 9am → Get notification
- ✅ "8 unread messages across 3 tribes"

---

## Cleanup Demo Tribes

If you want to remove all demo tribes:

```bash
psql $DATABASE_URL << 'EOF'
-- Delete demo tribes (you're the owner)
DELETE FROM tribes 
WHERE name IN ('Yoga Tribe', 'Beach Crew', 'Blvd Burger')
  AND owner_id = 'YOUR_USER_ID';
EOF
```

Or delete individual tribes:
```sql
DELETE FROM tribes WHERE name = 'Yoga Tribe' AND owner_id = 'YOUR_USER_ID';
```

---

## Synthetic Users

All synthetic users use the pattern `demo.user.*`:
- demo.user.sarah → Sarah Chen
- demo.user.mike → Mike Johnson
- demo.user.emma → Emma Davis
- demo.user.alex → Alex Kim
- demo.user.jordan → Jordan Taylor
- demo.user.casey → Casey Morgan
- demo.user.jamie → Jamie Rivera
- demo.user.riley → Riley Parker

These are NOT real users and only exist for demo purposes.

---

## Customization

Want different tribes? Edit `backend/scripts/seed-demo-tribes.js`:

```javascript
const TRIBES = [
  {
    name: 'Your Custom Tribe',
    owner: 'demo.user.sarah',  // Who owns it
    members: ['demo.user.mike', 'demo.user.emma'],  // Who's in it
    messages: [
      { from: 'demo.user.sarah', text: 'Your message here' }
    ],
    proposals: [
      {
        from: 'demo.user.sarah',
        to: ['demo.user.mike'],
        itemType: 'appointment',  // or 'todo', 'grocery', 'routine'
        data: { /* item data */ }
      }
    ]
  }
];
```

Then re-run the seed script.

---

## Troubleshooting

**"User not found"**
- Double-check your user ID
- Make sure you're signed in to the app
- Query database to find your correct user ID

**"Tribes not showing up"**
- Pull to refresh in app
- Check backend logs for errors
- Verify DATABASE_URL is correct

**"Prisma error"**
- Make sure all migrations are run
- Check that tribes, tribe_members, tribe_messages tables exist
- Run: `npx prisma generate` in backend folder

---

## Files Created

- `backend/scripts/seed-demo-tribes.js` - Seed script
- `seed-demo-tribes.sh` - Shell wrapper
- `DEMO_TRIBES_GUIDE.md` - This guide

---

## Example Output

```
🌱 ========================================
🌱 Seeding Demo Tribes
🌱 ========================================

📝 Your User ID: a1b2c3d4...

👥 Creating synthetic users...
   ✅ Created synthetic user: Sarah Chen (demo.user.sarah)
   ✅ Created synthetic user: Mike Johnson (demo.user.mike)
   ...

🏘️  Creating tribe: Yoga Tribe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Tribe created: Yoga Tribe
   ✅ Added owner (you) as member
   👥 Adding 4 members...
      - Sarah Chen
      - Emma Davis
      - Alex Kim
      - Casey Morgan
   💬 Adding 5 messages...
      ✅ Messages added
   📋 Creating 1 proposals...
      - appointment proposal created
   ✅ Yoga Tribe complete!

🎉 Demo Tribes Created Successfully!
```

Ready to create realistic demo data for testing! 🚀
