# Usage Module - Alpha Implementation (Beta Ready)

## ✅ Implementation Complete

The collapsible usage module has been implemented exactly per spec with production-grade UI and zero billing logic.

---

## 🎯 What's Live

### **Collapsible Bottom Drawer**

**Collapsed State (Default)**:
```
Free Plan · 42 / 50 this month ▓▓▓▓▓▓▓▓░░ ^
```

- Always visible at bottom of screen
- Shows: Plan name, usage numbers, progress bar, chevron
- Tap or click to expand

**Expanded State**:
- **Section 1**: Large progress bar, exact numbers, reset date
- **Section 2**: Smart pace indicator with projected usage
- **Section 3**: Action buttons (Upgrade Plan, Add Usage)

---

## 📋 Components Implemented

### **Core Components**:
1. `UsageDrawer.tsx` - Main container with expand/collapse logic
2. `UsageProgressBar.tsx` - Color-coded progress (green/yellow/red)
3. `UsagePaceIndicator.tsx` - Smart projections based on current pace
4. `UsageActions.tsx` - Upgrade and add-usage CTAs
5. `UsageInfoModal.tsx` - Info modals for actions (alpha: no billing)

### **Mock Service**:
- `mockUsageService.ts` - Alpha data provider
- Returns locked API contract shape
- TODO markers for beta replacement

---

## 🔒 Locked API Contract

```typescript
GET /api/usage/status (Beta)

Response:
{
  "plan": "free" | "pro" | "max",
  "used": number,
  "limit": number,
  "periodStart": string,
  "periodEnd": string,
  "resetAt": string,
  "pace": {
    "projectedTotal": number,
    "daysRemaining": number
  } | null,
  "actions": {
    "canUpgrade": boolean,
    "canAddUsage": boolean,
    "addUsageOptions": [
      { "amount": number, "price": number }
    ]
  }
}
```

**This contract will NOT change between alpha and beta.**

---

## 💡 Smart Features

### **Pace Indicator Logic**

Only shows after 3+ days of usage:

```
projectedTotal = (used / daysElapsed) * daysInMonth
```

**States**:
- ✅ **On track**: Projected usage < limit (green)
- ⚠️ **Approaching limit**: Projected usage > limit (amber)

**Example**:
```
⚠️ Approaching limit
At your current pace, you'll reach your limit in ~6 days
```

### **Color-Coded Progress**

- **< 70%**: Green (healthy)
- **70-89%**: Yellow (caution)
- **90-100%**: Red (critical)

---

## 🚫 Alpha Restrictions (By Design)

### **No Billing Logic**:
- Upgrade button → Opens info modal only
- Add usage button → Opens info modal only
- Modals show: "Billing will be enabled in beta"
- All billing CTAs are disabled with tooltips

### **Mock Data**:
- Free plan: 42 / 50 runs used
- Shows realistic pace indicator
- Demonstrates all UI states
- 300ms simulated API delay

---

## 🔌 Beta Wiring Checklist

When ready to enable billing, replace these TODOs:

### **1. Backend API** (`TODO` in `mockUsageService.ts`):
```typescript
// TODO (Beta): Replace with fetch('/api/usage/status')
```

### **2. Upgrade Flow** (`TODO` in `UsageInfoModal.tsx`):
- Wire "Confirm & Pay" button to Stripe subscription update
- Add prorated charge calculation
- Show confirmation on success

### **3. Add Usage Flow** (`TODO` in `UsageInfoModal.tsx`):
- Wire "Confirm & Pay" button to Stripe invoice item
- Create one-time charge (no auto-renew)
- Update usage limit for current period

### **4. Database Updates**:
- Track usage per user per month
- Store plan changes with timestamps
- Log add-usage purchases

### **5. Hard Limit Enforcement**:
- Block API calls when `used >= limit`
- Return 429 with usage info
- Prompt upgrade/add-usage

---

## 📊 Current Mock Data

**Plan**: Free  
**Limit**: 50 runs/month  
**Used**: 42 runs  
**Percentage**: 84% (yellow warning state)  
**Projected**: ~65 runs (will exceed)  
**Days Remaining**: 6 days until limit  
**Reset**: Start of next month  

**Upgrade Options**:
- Pro: $9/mo (500 runs)
- Max: $19/mo (5000 runs)

**Add Usage Options**:
- 500 runs for $10
- 1000 runs for $18

---

## 🎨 UX Principles (Implemented)

✅ **Always accessible** - Fixed to bottom, never hidden  
✅ **Never interruptive** - Collapsed by default  
✅ **Zero ambiguity** - Clear numbers, clear costs  
✅ **Explicit consent** - All actions require confirmation  
✅ **Smart guidance** - Pace indicator helps users plan  
✅ **Progressive disclosure** - Collapsed → Expanded → Modal  

---

## 🚀 What This Enables (Beta)

### **For Users**:
- Transparent usage tracking
- No surprise charges
- Proactive limit management
- Clear upgrade paths
- One-time usage boosts

### **For Business**:
- Clean monetization UX
- Explicit upgrade funnel
- Usage-based pricing ready
- Per-agent pricing ready (future)
- Team usage ready (future)

---

## 📱 Responsive Behavior

**Desktop**:
- Shows full usage numbers in collapsed state
- Expanded drawer takes 60% of viewport height
- All text fully visible

**Mobile**:
- Hides some details in collapsed state (saves space)
- Expanded drawer takes 70% of viewport height
- Touch-optimized tap targets

---

## 🔧 Customization Points

### **Usage Limits** (edit `mockUsageService.ts`):
```typescript
const used = 42;  // Current usage
const limit = 50; // Monthly limit
```

### **Plan Names**:
```typescript
plan: "free" | "pro" | "max"
```

### **Add Usage Pricing**:
```typescript
addUsageOptions: [
  { amount: 500, price: 10 },
  { amount: 1000, price: 18 }
]
```

---

## ✨ Production Quality

**Code Quality**:
- Full TypeScript types
- Locked contracts
- Clear TODO markers
- Component isolation
- Zero prop drilling

**Performance**:
- Lazy renders (only when needed)
- Smooth animations (300ms transitions)
- No layout shift
- No blocking renders

**Accessibility**:
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader friendly

---

## 🎯 Next Steps (Your Choice)

### **Option A: Define Usage Units**
- What counts as a "run"?
- Agent call? Minute? Token?
- Weighted complexity?

### **Option B: Define Plan Limits**
- Free: X runs
- Pro: Y runs
- Max: Unlimited or Z runs?

### **Option C: Stripe Products Setup**
- Create subscription products
- Create add-usage invoice items
- Define pricing IDs

### **Option D: Backend Implementation**
- Build GET /api/usage/status
- Wire to database
- Track per-user usage
- Implement limit enforcement

---

## 🔥 Live Demo

**URL**: https://helpem-poc.vercel.app

**Try It**:
1. Go to any page
2. Look at bottom of screen (collapsed drawer)
3. Click to expand
4. See usage, pace, and actions
5. Click "Upgrade Plan" or "Add Usage"
6. See beta-ready modals with pricing

---

## 💬 Alpha User Feedback Script

> "We're showing you transparent usage tracking in alpha. Billing will be enabled in beta. This is exactly what you'll see when managing your usage limits. Let us know if anything is unclear!"

---

**Status**: ✅ Alpha Complete, Beta Ready  
**Billing**: 🚫 Disabled (by design)  
**Contract**: 🔒 Locked  
**Wiring Effort**: ⚡ Trivial (TODOs marked)

---

**Required Answer Before Next Step**:  
Is this for a specific standalone agent or broader portfolio infrastructure?
