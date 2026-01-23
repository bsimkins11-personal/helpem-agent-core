# Generate Test Token - Step by Step

Follow these steps to generate a valid test token for iOS testing:

## Step 1: Get JWT_SECRET from Railway

1. **Go to Railway dashboard:** https://railway.app
2. **Click on your backend service** (the "api" service)
3. **Click the "Variables" tab**
4. **Find JWT_SECRET** in the list
5. **Click the eye icon** to reveal the value
6. **Copy the entire value** (it's a long string)

## Step 2: Generate the Token

**In your terminal**, run:

```bash
cd /Users/avpuser/HelpEm_POC/backend

# Replace YOUR_JWT_SECRET_HERE with the actual value from Railway
JWT_SECRET="YOUR_JWT_SECRET_HERE" node generate-test-token.js
```

**Example:**
```bash
JWT_SECRET="my-super-secret-key-from-railway-12345" node generate-test-token.js
```

The script will print:
- A long session token
- A user ID
- An Apple user ID
- Instructions for next steps

## Step 3: Update iOS Code

1. **Open Xcode** (if not already open)
2. **Open file:** `ios/HelpEmApp/AuthManager.swift`
3. **Find the `skipAuthForTesting()` method** (around line 150)
4. **Replace these three lines:**

```swift
// OLD:
let mockSessionToken = "test_token_\(UUID().uuidString)"
let mockAppleUserId = "test_user_\(UUID().uuidString)"
let mockUserId = UUID().uuidString

// NEW (use values from the script output):
let mockSessionToken = "PASTE_THE_LONG_TOKEN_HERE"
let mockAppleUserId = "PASTE_APPLE_USER_ID_HERE"
let mockUserId = "PASTE_USER_ID_HERE"
```

5. **Save the file** (Cmd+S)

## Step 4: Test in iOS

1. **Build and run** the app in Xcode (Click Play button or Cmd+R)
2. **Tap "Skip for Testing"** on the sign-in screen
3. **Tap the blue floating button** in the bottom-right corner
4. This opens the **Database Test** view
5. **Type a test message:** "Hello from iOS!"
6. **Tap "Save as Text"**
7. You should see: **✅ "Saved successfully!"**

## Step 5: Verify in Database

**Go back to Railway dashboard:**

1. **Click on your Postgres service**
2. **Click the "Data" tab**
3. **Run this query:**

```sql
SELECT * FROM user_inputs ORDER BY created_at DESC LIMIT 10;
```

4. **You should see your message!** 🎉

The row will show:
- `content`: "Hello from iOS!"
- `type`: "text"
- `user_id`: The test user ID you used
- `created_at`: Current timestamp

---

## Troubleshooting

### "JWT_SECRET not set" error
- Make sure you copied the JWT_SECRET correctly from Railway
- Make sure there are quotes around the value in the terminal command
- Try running the command on one line

### "Saved successfully" but no data in Railway
- Check Railway backend logs for any errors
- Verify the backend service is running
- Check the user_id matches what you put in iOS code

### "Network error" in iOS
- Verify your phone has internet connection
- Check the API URL in APIClient.swift is correct
- Make sure Railway backend is deployed and healthy

---

## Quick Test Command

If you want to just test the backend is working, try this from your terminal:

```bash
# Test health endpoint
curl https://api-production-2989.up.railway.app/health

# Should return: {"status":"ok","db":"ok"}
```

---

**Need help? The JWT_SECRET is in Railway → backend service → Variables tab!**
