# Quick UAT Guide - What to Test

**🎯 5-Minute Essential Tests**

---

## Test 1: Demo Tribes Auto-Appear (2 min)

### Steps:
1. Open HelpEm app on device
2. Sign in with Apple
3. Look at tribes section

### ✅ Pass If:
- See 3 tribes automatically: 🏠 My Family, 💼 Work Team, 🏘️ Roommates
- Purple "Preview Mode" banner shows
- No errors

### ❌ Fail If:
- No tribes appear
- See old tribes (Yoga Tribe, Beach Crew, etc.)
- Errors or crashes

---

## Test 2: Demo Tribe Content (1 min)

### Steps:
1. Tap "🏠 My Family"
2. Read messages

### ✅ Pass If:
- See messages from Sarah, Mom, Alex
- Messages are realistic (milk, dinner, homework)
- Can scroll through messages

### ❌ Fail If:
- No messages
- Broken layout
- Can't open tribe

---

## Test 3: Create Real Tribe (1 min)

### Steps:
1. Go to Tribes Settings
2. Tap "Create Tribe"
3. Name it "My Real Tribe"
4. Create

### ✅ Pass If:
- New tribe created
- Demo tribes disappear automatically
- Only see "My Real Tribe"

### ❌ Fail If:
- Can't create tribe
- Demo tribes don't disappear
- Errors

---

## Test 4: Core Features (1 min)

### Steps:
1. Go back to main app
2. Add a todo: "Test item"
3. Add an appointment
4. Check grocery list

### ✅ Pass If:
- Items save successfully
- Display correctly
- Can mark complete

### ❌ Fail If:
- Can't create items
- Items don't save
- App crashes

---

## 🚨 If Something Breaks

**Take a screenshot and note:**
- What you were doing
- Error message (if any)
- Expected vs. actual behavior

**Check console logs:**
- Safari: Settings → Safari → Advanced → Web Inspector
- Look for red error messages

---

## ✅ Expected Results

**Demo Tribes:**
- 3 tribes auto-appear
- Each has realistic content
- Banner explains preview mode
- Remove automatically on first real tribe

**Core App:**
- Todos, appointments, routines work
- Voice input works
- Items save and display
- Calendar view works

---

**Time:** ~5 minutes  
**Focus:** Demo tribes + core features  
**Goal:** Verify production is working before broader testing
