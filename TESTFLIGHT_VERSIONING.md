# TestFlight Versioning Guide

## 📦 Version vs Build Number

### Version (MARKETING_VERSION)
- **Example**: 1.0, 1.1, 2.0
- **User-facing** - shown in App Store
- Can stay the same across multiple builds
- Change when releasing new features

### Build Number (CURRENT_PROJECT_VERSION)
- **Example**: 1, 2, 3, 4, 5...
- **Internal** - for tracking
- **Must be unique** for each TestFlight upload
- **Must always increment** - cannot reuse

---

## ✅ TestFlight Rules

### Rule 1: Build Numbers Must Be Unique
❌ **Cannot do this:**
```
Upload: Version 1.0, Build 7
Upload: Version 1.0, Build 7  ← REJECTED by App Store Connect
```

✅ **Must do this:**
```
Upload: Version 1.0, Build 7
Upload: Version 1.0, Build 8  ← ✅ Accepted
```

### Rule 2: Build Numbers Must Increment
Each upload needs a **higher** build number than the previous:
```
Build 1 → Build 2 → Build 3 → Build 4...
```

### Rule 3: Cannot Skip or Go Backwards
❌ Build 5 → Build 3 (rejected)  
❌ Build 10 → Build 5 (rejected)  
✅ Build 5 → Build 6 (works)  
✅ Build 5 → Build 100 (works - you can jump forward)

---

## 🔄 Your Current Status

**Current:**
- Version: **1.0**
- Build: **8** (just incremented for microphone fix)

**Previous builds:**
- Build 1-7: Previous TestFlight uploads

**Next upload:**
- Version: **1.0** (or 1.1 if you want)
- Build: **9** (must be 9 or higher)

---

## 📝 When to Increment What

### Increment Build Number (Always)
**When:** Every TestFlight upload
```
Before upload: Build 8
After upload:  Build 9 (for next upload)
```

### Increment Version Number (When Features Change)
**When:** Significant updates

**Example Timeline:**
```
Version 1.0, Build 1  - Initial release
Version 1.0, Build 2  - Bug fixes
Version 1.0, Build 3  - More bug fixes
Version 1.1, Build 4  - New feature added
Version 1.1, Build 5  - Bug fixes for 1.1
Version 2.0, Build 6  - Major redesign
```

---

## 🚀 Upload Workflow

### Step 1: Before Each Upload
```bash
# Check current version
grep CURRENT_PROJECT_VERSION ios/HelpEmApp.xcodeproj/project.pbxproj
# Should show: CURRENT_PROJECT_VERSION = 8
```

### Step 2: Archive in Xcode
1. Open project in Xcode
2. Product → Archive
3. Wait for build to complete

### Step 3: Upload to App Store Connect
1. Click **Distribute App**
2. Choose **App Store Connect**
3. Upload
4. Build appears in App Store Connect after processing (5-10 min)

### Step 4: Add Testers
1. Go to App Store Connect
2. TestFlight tab
3. Select build 8
4. Add norayne as tester
5. She gets notification to install

### Step 5: Increment for Next Time
```bash
# Manually increment in Xcode project settings
# Or I can do it for you!
```

---

## 🔍 Common Scenarios

### Scenario 1: Quick Bug Fix
**Current:** Version 1.0, Build 8  
**Action:** Fix bug, upload  
**New:** Version 1.0, Build 9

### Scenario 2: New Feature
**Current:** Version 1.0, Build 8  
**Action:** Add feature, upload  
**New:** Version 1.1, Build 9 (increment both)

### Scenario 3: Multiple Fixes Same Day
**Morning:** Version 1.0, Build 8  
**Afternoon:** Version 1.0, Build 9  
**Evening:** Version 1.0, Build 10  
✅ All three can be uploaded same day!

### Scenario 4: Rejected by App Review
**Uploaded:** Version 1.0, Build 8  
**Status:** Rejected  
**Fix & Reupload:** Version 1.0, Build 9  
(Cannot reuse Build 8)

---

## ⚠️ What Happens If You Try to Reuse

### If You Try Build 7 Again:
```
Xcode → Archive → Upload → 
App Store Connect: 
❌ "Error: Build 7 already exists for version 1.0"
Upload fails
```

**Solution:** Increment to Build 8 (or higher)

---

## 💡 Pro Tips

### Tip 1: Increment Immediately After Upload
Right after uploading Build 8, immediately increment to Build 9 in your project. That way you never forget!

### Tip 2: Use Sequential Numbers
Don't skip numbers unnecessarily. Keep it simple:
- 1, 2, 3, 4, 5... ✅
- Not 1, 5, 27, 100... ❌ (confusing)

### Tip 3: Document Major Builds
Keep notes of what changed in each build:
```
Build 1: Initial release
Build 2: Fixed login bug
Build 3: Added dark mode
Build 8: Fixed microphone permissions
```

### Tip 4: Version = User-Facing, Build = Internal
- Users see: **Version 1.0**
- You track: **Build 8**
- Both are important, but users only care about version

---

## 📱 TestFlight User Experience

### What Testers See:
```
helpem
Version 1.0 (8)
        ↑    ↑
     Version Build
```

In TestFlight app, they see both numbers.

### What App Store Users See:
```
helpem
Version 1.0
```

Only the version number - build is hidden.

---

## ✅ Quick Reference

| Situation | Version | Build | Action |
|-----------|---------|-------|--------|
| Bug fix | Same | +1 | Upload |
| Small feature | +0.1 | +1 | Upload |
| Major release | +1.0 | +1 | Upload |
| Rejected build | Same | +1 | Fix & upload |
| TestFlight crash | Same | +1 | Fix & upload |

---

## 🎯 Your Next Upload Checklist

- [ ] Fix/feature complete
- [ ] Increment build number (currently 8 → 9 for next)
- [ ] Archive in Xcode
- [ ] Upload to App Store Connect
- [ ] Wait for processing (~5-10 min)
- [ ] Add testers in TestFlight
- [ ] Testers receive notification
- [ ] Increment build number again for next upload

---

## 📞 Current Status Summary

**Ready for TestFlight:**
- ✅ Version: 1.0
- ✅ Build: 8
- ✅ Microphone permissions: Fixed
- ✅ Info.plist: Updated
- ✅ Ready to archive and upload

**For norayne:**
- She'll receive: helpem 1.0 (8)
- First voice use: iOS asks for mic permissions
- After granting: Voice works forever

---

**Always increment build number, never reuse!** 🚀
