# Quick Test: Usage Alerts

## Test 50% Warning Alert (Amber)

1. **Edit the mock data:**
   - Open: `/web/src/lib/mockUsageService.ts`
   - Line 51: Change `const used = 15;` to `const used = 550;`

2. **Clear localStorage (browser console):**
   ```javascript
   localStorage.removeItem('usageAlert-2026-01');
   ```

3. **Refresh the app**
   - Expected: Amber/orange alert appears at top
   - Message: "You've used 550 of 1000 messages this month (55%). 450 messages remaining."

4. **Test dismissal:**
   - Click X button
   - Refresh page
   - Expected: Alert stays hidden

---

## Test 90% Critical Alert (Red)

1. **Edit the mock data:**
   - Open: `/web/src/lib/mockUsageService.ts`
   - Line 51: Change `const used = 550;` to `const used = 920;`

2. **Clear localStorage (browser console):**
   ```javascript
   localStorage.removeItem('usageAlert-2026-01');
   ```

3. **Refresh the app**
   - Expected: Red/pink alert appears at top
   - Message: "You're running low! 920 of 1000 messages used (92%). Only 80 messages left."

4. **Test dismissal:**
   - Click X button
   - Refresh page
   - Expected: Alert stays hidden

---

## Test Progressive Alerts (50% → 90%)

1. Set `used = 500`, clear localStorage, refresh
   → See 50% warning

2. Dismiss the 50% warning

3. Set `used = 900`, refresh (don't clear localStorage)
   → See 90% critical alert (even though 50% was dismissed!)

---

## Reset to Normal

After testing, reset the value:
- Line 51: Change back to `const used = 15;`
- Clear localStorage
- Refresh

---

## Browser Console Helpers

### Clear all usage alerts
```javascript
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('usageAlert-')) {
    localStorage.removeItem(key);
  }
});
```

### Check dismissal status
```javascript
const month = new Date().toISOString().slice(0, 7);
console.log(localStorage.getItem(`usageAlert-${month}`));
```

---

Ready to test! 🎯
