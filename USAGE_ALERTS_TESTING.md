# Usage Alerts Testing Guide

## Overview
Usage alerts automatically appear at the top of the app when users reach 50% and 90% of their monthly usage limit.

## Alert Behavior

### 50% Warning Alert
- **Appears at**: 500+ messages used (50% of 1000 limit)
- **Color**: Amber/Orange gradient
- **Icon**: ⚠️
- **Message**: "You've used X of 1000 messages this month (50%). 500 messages remaining."

### 90% Critical Alert
- **Appears at**: 900+ messages used (90% of 1000 limit)
- **Color**: Red/Pink gradient
- **Icon**: 🚨
- **Message**: "You're running low! X of 1000 messages used (90%). Only 100 messages left."

## Dismissal Logic

1. **Per-Month Tracking**: Alerts are tracked by month (YYYY-MM format)
2. **Per-Level Dismissal**: Dismissing 50% alert doesn't prevent 90% alert
3. **One-Time Per Level**: Once dismissed at a level, won't show again that month
4. **Auto-Reset**: New month = new alerts

### localStorage Keys
- `usageAlert-2026-01`: Stores dismissed level ("50" or "90")

## Testing Instructions

### Test 1: 50% Alert (Warning)
1. Edit `/web/src/lib/mockUsageService.ts`
2. Change line 51: `const used = 500;` (or 501-899)
3. Clear localStorage: `localStorage.removeItem('usageAlert-2026-01')`
4. Refresh app
5. **Expected**: Amber alert appears at top
6. Click X to dismiss
7. Refresh app
8. **Expected**: Alert stays hidden

### Test 2: 90% Alert (Critical)
1. Edit `/web/src/lib/mockUsageService.ts`
2. Change line 51: `const used = 900;` (or 901-999)
3. Clear localStorage: `localStorage.removeItem('usageAlert-2026-01')`
4. Refresh app
5. **Expected**: Red alert appears at top
6. Click X to dismiss
7. Refresh app
8. **Expected**: Alert stays hidden

### Test 3: Progressive Alerts
1. Set `used = 500`
2. Clear localStorage
3. Refresh → See 50% warning
4. Dismiss 50% warning
5. Set `used = 900`
6. Refresh → See 90% critical (even though 50% was dismissed)
7. **Expected**: 90% alert appears

### Test 4: Below Threshold
1. Set `used = 15` (default)
2. Clear localStorage
3. Refresh
4. **Expected**: No alert appears

### Test 5: Month Rollover
1. Set `used = 900`
2. Clear localStorage
3. Refresh → See alert
4. Dismiss alert
5. Manually change localStorage key to last month: `usageAlert-2025-12`
6. Refresh
7. **Expected**: Alert appears again (new month)

## Quick Test Commands

### Clear All Alert Dismissals (Browser Console)
```javascript
// Clear all usage alerts
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('usageAlert-')) {
    localStorage.removeItem(key);
  }
});
console.log('All usage alerts cleared!');
```

### Check Current Dismissal Status
```javascript
const currentMonth = new Date().toISOString().slice(0, 7);
const key = `usageAlert-${currentMonth}`;
console.log(`Alert status for ${currentMonth}:`, localStorage.getItem(key) || 'Not dismissed');
```

### Force Show 50% Alert
```javascript
const currentMonth = new Date().toISOString().slice(0, 7);
localStorage.removeItem(`usageAlert-${currentMonth}`);
// Then set used = 500 in mockUsageService.ts and refresh
```

### Force Show 90% Alert
```javascript
const currentMonth = new Date().toISOString().slice(0, 7);
localStorage.removeItem(`usageAlert-${currentMonth}`);
// Then set used = 900 in mockUsageService.ts and refresh
```

## UI Position
- **Location**: Top of app, above alpha feedback banner
- **Layout**: Full width, sticky positioning
- **Stacking**: Usage alerts → Alpha feedback → App content
- **Mobile**: Responsive, text wraps on small screens

## Design Details

### 50% Warning Alert
- Background: `bg-gradient-to-r from-amber-500 to-orange-500`
- Icon: ⚠️ (warning sign)
- Text: White
- Close button: White with hover effect

### 90% Critical Alert
- Background: `bg-gradient-to-r from-red-600 to-pink-600`
- Icon: 🚨 (police siren)
- Text: White
- Close button: White with hover effect

## Edge Cases Handled

✅ **No spam**: Once dismissed, stays dismissed for that month
✅ **Progressive alerts**: 50% dismissal doesn't block 90% alert
✅ **Month boundaries**: Alerts reset on new month
✅ **Error handling**: Fails silently if API errors
✅ **Loading state**: No flash if data loads slowly
✅ **Multiple tabs**: Each tab checks independently

## Production Checklist

- [ ] Verify 50% alert appears at 500 messages
- [ ] Verify 90% alert appears at 900 messages
- [ ] Verify dismissal works
- [ ] Verify dismissal persists across refreshes
- [ ] Verify 90% can appear even after 50% dismissed
- [ ] Test mobile responsive design
- [ ] Verify no console errors
- [ ] Test month rollover (change system date)

## Future Enhancements (Post-Alpha)

1. **Real API Integration**: Replace mock with `/api/usage/status`
2. **Usage Detail Link**: Click alert to open usage modal
3. **Upgrade CTA**: Add "Upgrade Plan" button in critical alert
4. **Email Notifications**: Send email at 90% threshold
5. **Custom Thresholds**: Let users set their own alert levels
6. **Usage Chart**: Show usage trend in alert
7. **Snooze Option**: "Remind me in 3 days" button

## Notes

- Current limit: 1000 messages/month (alpha tier)
- Current cost limit: $2/month API usage
- Alerts based on message count, not cost
- Beta will integrate real usage API endpoint
