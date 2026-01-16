# 🎨 Hero Carousel Image Guide

## ✅ Changes Made

1. **Reduced white space** - Header to carousel spacing tightened
2. **Image-ready carousel** - Supports images/videos with text overlay
3. **Dynamic gradients** - Each slide has unique overlay color
4. **Text drop shadows** - Ensures readability on any image

---

## 📁 How to Add Your Images

### Step 1: Add Images to Project

Place your images in:
```
/Users/avpuser/HelpEm_POC/web/public/images/
```

**Recommended specs:**
- **Size**: 1920x1080px (16:9 ratio)
- **Format**: JPG or WebP (optimized for web)
- **File size**: < 500KB each (for fast loading)
- **Names**: busy-parent.jpg, entrepreneur.jpg, student.jpg

---

### Step 2: Update Carousel Code

**Location**: `/Users/avpuser/HelpEm_POC/web/src/app/page.tsx`

**Find this section (lines 10-29):**

```typescript
const slides = [
  {
    title: "Busy Parent",
    description: "Juggling kids, work, and life—HelpEm keeps it all organized",
    // Replace with your image path: "/images/busy-parent.jpg"
    image: "👨‍👩‍👧‍👦",
    bgGradient: "from-brandBlue/80 via-brandBlue/60 to-brandGreen/80"
  },
  // ... more slides
];
```

**Change to:**

```typescript
const slides = [
  {
    title: "Busy Parent",
    description: "Juggling kids, work, and life—HelpEm keeps it all organized",
    image: "/images/busy-parent.jpg",  // ← Your image path
    bgGradient: "from-brandBlue/80 via-brandBlue/60 to-brandGreen/80"
  },
  {
    title: "Entrepreneur", 
    description: "Managing multiple projects—HelpEm never lets anything slip",
    image: "/images/entrepreneur.jpg",  // ← Your image path
    bgGradient: "from-purple-600/80 via-brandBlue/60 to-brandGreen/80"
  },
  {
    title: "Student",
    description: "Balancing classes and deadlines—HelpEm keeps you on track",
    image: "/images/student.jpg",  // ← Your image path
    bgGradient: "from-brandGreen/80 via-brandBlue/60 to-purple-600/80"
  }
];
```

---

## 🎬 Video Support (Coming Soon)

To add videos instead of images:

```typescript
{
  title: "Your Title",
  description: "Your description",
  video: "/videos/your-video.mp4",  // Video file
  image: "/images/poster.jpg",       // Poster image (fallback)
  bgGradient: "from-brandBlue/80 via-brandBlue/60 to-brandGreen/80"
}
```

I can add video support when you're ready!

---

## 🎨 Customizing Text Overlay

### Change Headline Text
```typescript
title: "Your Custom Headline Here"
```

### Change Description
```typescript
description: "Your custom description text here"
```

### Change Overlay Color
```typescript
bgGradient: "from-blue-600/80 via-purple-500/60 to-pink-600/80"
```

**Available gradient colors:**
- `brandBlue` (HelpEm blue)
- `brandGreen` (HelpEm green)
- `purple-600`, `pink-600`, `indigo-600`, `teal-600`, etc.

**Opacity levels:**
- `/80` = 80% opacity (darker overlay)
- `/60` = 60% opacity (medium overlay)
- `/40` = 40% opacity (lighter overlay)

---

## 📝 Example with Your Images

Once you add images to `/web/public/images/`:

```typescript
const slides = [
  {
    title: "Busy Mom Managing It All",
    description: "From soccer practice to board meetings—HelpEm keeps every detail organized",
    image: "/images/busy-parent.jpg",
    bgGradient: "from-brandBlue/70 via-brandBlue/50 to-brandGreen/70"
  },
  {
    title: "Entrepreneur Building Dreams",
    description: "Multiple ventures, countless tasks—HelpEm never lets anything slip through",
    image: "/images/entrepreneur.jpg",
    bgGradient: "from-purple-700/70 via-brandBlue/50 to-brandGreen/70"
  },
  {
    title: "Student Conquering Deadlines",
    description: "Classes, projects, social life—HelpEm keeps you on top of it all",
    image: "/images/student.jpg",
    bgGradient: "from-brandGreen/70 via-brandBlue/50 to-purple-700/70"
  }
];
```

---

## 🚀 Deployment After Adding Images

```bash
# From project root
git add web/public/images/
git add web/src/app/page.tsx
git commit -m "Add hero carousel images"
git push origin main

# Deploy
cd web
vercel --prod
```

---

## 💡 Tips for Great Carousel Images

1. **High Energy** - Choose dynamic, action-oriented photos
2. **Clear Subjects** - People clearly visible and recognizable
3. **Good Lighting** - Bright, professional photos work best
4. **Emotion** - Show people engaged, happy, productive
5. **Context** - Include environment (office, home, coffee shop)
6. **Diversity** - Represent different personas authentically

---

## 📸 Image Resources (If Needed)

**Free Stock Photos:**
- Unsplash.com
- Pexels.com
- Pixabay.com

**Search terms:**
- "busy parent organizing"
- "entrepreneur working laptop"
- "student studying organized"
- "professional multitasking"
- "person using phone productivity"

---

## ✅ Current Status

- ✅ Spacing fixed (reduced white space)
- ✅ Image overlay structure ready
- ✅ Text with drop shadows (readable on any bg)
- ✅ Smooth transitions (1 second fade)
- ✅ Auto-play (5 seconds per slide)
- ✅ Click dots to navigate
- ⏳ **Waiting for your images!**

---

**Ready to add your images?** Let me know and I can help format them perfectly!
