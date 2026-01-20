# Task Category Separation - Clean Architecture

## Current Problem
All task categories (appointments, todos, habits, groceries) share the same interaction logic, causing:
- Appointment-specific code interfering with todos
- Complex interception logic trying to handle all cases
- Infinite loops when logic overlaps
- Difficult to debug and maintain

## Proposed Architecture

Each category gets its own:
1. **Mandatory fields**
2. **Optional fields**
3. **Question flow**
4. **Validation rules**
5. **Client-side handler**

---

## Category 1: APPOINTMENTS

### Array Structure
`[date, time, duration, who, what, where]`

### Fields
**Mandatory:**
- `datetime` (date + time combined)
- `durationMinutes`
- `withWhom` (who)

**Optional (client asks after creation):**
- `topic` (what)
- `location` (where)

### AI Flow (route.ts)
```typescript
// Appointment-specific rules
IF (type === "appointment") {
  Step 1: Extract what you can from initial message
  Step 2: Missing datetime? → Ask "When?"
  Step 3: Missing duration? → Ask "How long?"
  Step 4: Missing withWhom? → Ask "Who's the meeting with?"
  Step 5: Have all 3 mandatory? → Return action: "add" with JSON
  
  NEVER ask about topic/location - client handles those!
}
```

### Client Handler (ChatInput.tsx)
```typescript
// Appointment-specific builder
if (data.type === "appointment") {
  // Check mandatory fields
  if (!hasAllMandatory(datetime, duration, who)) {
    // Let AI ask for missing mandatory
    return;
  }
  
  // Ask about optional fields (topic, location)
  askOptionalFields();
}
```

---

## Category 2: TODOS

### Array Structure
`[task, priority, dueDate]`

### Fields
**Mandatory:**
- `title` (what needs to be done)

**Optional:**
- `priority` (default: medium)
- `dueDate` (optional deadline)

### AI Flow
```typescript
IF (type === "todo") {
  Step 1: Extract task from message
  Step 2: Have task? → Return action: "add" immediately
  
  Client will ask about priority/dueDate after creation if needed.
}
```

### Client Handler
```typescript
if (data.type === "todo") {
  addTodo(data);
  
  // Optionally ask about priority
  if (shouldAskPriority()) {
    ask("Would you like to set a priority?");
  }
}
```

---

## Category 3: HABITS/ROUTINES

### Array Structure
`[habit, frequency, days]`

### Fields
**Mandatory:**
- `title` (habit description)
- `frequency` (daily or weekly)

**Optional:**
- `daysOfWeek` (for weekly routines)
- `timeOfDay` (when to do it)

### AI Flow
```typescript
IF (type === "routine" || type === "habit") {
  Step 1: Extract habit title
  Step 2: Determine frequency (daily/weekly)
  Step 3: Weekly? → Ask "Which days?"
  Step 4: Return action: "add"
}
```

---

## Category 4: GROCERIES

### Array Structure
`[item, quantity, store]`

### Fields
**Mandatory:**
- `item` (what to buy)

**Optional:**
- `quantity` (how much)
- `store` (where to buy)

### AI Flow
```typescript
IF (type === "grocery") {
  Step 1: Extract item name
  Step 2: Return action: "add" immediately
  
  No follow-up questions needed!
}
```

---

## Implementation Plan

### Phase 1: Separate AI Instructions
Create distinct sections in `route.ts`:

```typescript
// ==============================================================================
// APPOINTMENTS - Mandatory: datetime, duration, withWhom
// ==============================================================================
[appointment instructions]

// ==============================================================================
// TODOS - Mandatory: title
// ==============================================================================
[todo instructions]

// ==============================================================================
// HABITS - Mandatory: title, frequency
// ==============================================================================
[habit instructions]

// ==============================================================================
// GROCERIES - Mandatory: item
// ==============================================================================
[grocery instructions]
```

### Phase 2: Separate Client Handlers
Create dedicated handler functions in `ChatInput.tsx`:

```typescript
const handleAppointmentResponse = (data) => {
  // Appointment-specific logic
  // Check 4 mandatory fields
  // Ask about 2 optional fields
};

const handleTodoResponse = (data) => {
  // Todo-specific logic
  // Add immediately, optionally ask priority
};

const handleHabitResponse = (data) => {
  // Habit-specific logic
};

const handleGroceryResponse = (data) => {
  // Grocery-specific logic
};

// Main handler
if (data.type === "appointment") return handleAppointmentResponse(data);
if (data.type === "todo") return handleTodoResponse(data);
if (data.type === "routine") return handleHabitResponse(data);
if (data.type === "grocery") return handleGroceryResponse(data);
```

### Phase 3: Remove Shared Logic
Delete or isolate logic that tries to handle all categories:
- Remove todo-specific code from appointment handler
- Remove appointment-specific code from todo handler
- No more `if/else` chains trying to handle all cases

---

## Benefits

### 1. Clarity
Each category is self-contained and easy to understand.

### 2. Maintainability
Bugs in appointments don't affect todos.
Changes to habits don't break groceries.

### 3. Testability
Can test each category independently.

### 4. Performance
No unnecessary checks for irrelevant fields.

### 5. Scalability
Easy to add new categories without touching existing code.

---

## Migration Strategy

### Option A: Refactor in Place
- Keep existing files
- Add category-specific handlers
- Gradually migrate logic

### Option B: Create New Handlers
- Create `handleAppointment.ts`, `handleTodo.ts`, etc.
- Import into `ChatInput.tsx`
- Clean separation from the start

**Recommended:** Option B for cleaner separation.

---

## Immediate Action

**For this deployment:**
Keep the current fixes but add clear comments separating appointment logic from other categories.

**Next session:**
Refactor into separate handler functions with clear boundaries.

---

## Current State
- ✅ Fixed infinite "No" loop
- ✅ Fixed withWhom overwrite
- ✅ Fixed correction detection
- ✅ Made withWhom mandatory for appointments
- ⚠️ Still has shared logic that needs separation
