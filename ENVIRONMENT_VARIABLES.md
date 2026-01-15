# Environment Variables Reference

## Backend (Railway)

### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | Railway internal Postgres URL | `postgresql://postgres:...@postgres.railway.internal:5432/railway` |
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars) | `your-secure-random-secret-here-min-32-chars` |
| `APPLE_CLIENT_ID` | Apple Bundle ID for Sign in with Apple | `com.helpem.agent` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `8080` | `8080` |
| `ENABLE_DB_HEALTH` | Enable DB probe in /health endpoint | `false` | `true` |
| `NODE_ENV` | Node environment | `production` | `production` |

### Build/Deploy Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `NIXPACKS_NODE_VERSION` | Node version for Prisma 7 compatibility | `22.12.0` |

---

## Web (Vercel)

### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api-production-2989.up.railway.app` |
| `JWT_SECRET` | Must match backend JWT_SECRET | `same-as-backend-secret` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_WEB_URL` | Web app URL (for CORS) | `https://helpem-poc.vercel.app` |

---

## iOS (Xcode Project)

### Hardcoded in Source

**File:** `ios/HelpEmApp/AuthManager.swift`
```swift
private let apiBaseURL = "https://api-production-2989.up.railway.app"
```

**File:** `ios/HelpEmApp/WebViewContainer.swift`
```swift
static let webAppURL = "https://helpem-poc.vercel.app"
static let apiURL = "https://api-production-2989.up.railway.app"
```

### Apple Developer Configuration

| Setting | Value |
|---------|-------|
| Bundle ID | `com.helpem.agent` |
| Sign in with Apple | Enabled in Capabilities |
| Keychain Sharing | Enabled in Capabilities |

---

## Local Development

### Backend Local Setup

Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/helpem_dev
JWT_SECRET=local-dev-secret-min-32-characters-long
APPLE_CLIENT_ID=com.helpem.agent
ENABLE_DB_HEALTH=true
```

### Web Local Setup

Create `web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
JWT_SECRET=local-dev-secret-min-32-characters-long
```

### iOS Local Development

Update URLs in Swift files to point to:
- `http://localhost:3000` (web dev server)
- `http://localhost:8080` (backend dev server)

Or use ngrok/Railway dev URLs for device testing.

---

## Security Notes

1. **JWT_SECRET**
   - Must be at least 32 characters
   - Use cryptographically secure random string
   - Must match between backend and web
   - Never commit to git

2. **DATABASE_URL**
   - Use Railway's internal URL (`postgres.railway.internal`) in production
   - Never use external/public Postgres URL from Railway dashboard
   - Internal URL provides better performance and security

3. **Apple Credentials**
   - `APPLE_CLIENT_ID` must match Bundle ID in Xcode
   - Bundle ID must match Apple Developer portal configuration
   - No email/name stored per privacy policy

---

## Current Production URLs

| Service | URL |
|---------|-----|
| Backend API | `https://api-production-2989.up.railway.app` |
| Web App | `https://helpem-poc.vercel.app` |
| iOS Bundle ID | `com.helpem.agent` |

---

## Troubleshooting

### Issue: "APPLE_CLIENT_ID not set"
**Solution:** Add `APPLE_CLIENT_ID=com.helpem.agent` to Railway environment variables

### Issue: "JWT_SECRET not set"
**Solution:** Add `JWT_SECRET=<32+ char secret>` to Railway environment variables

### Issue: "Can't reach database server"
**Solution:** 
1. Connect Postgres service to backend in Railway
2. Verify `DATABASE_URL` uses internal URL (`postgres.railway.internal`)

### Issue: iOS auth fails with "Invalid Apple identity token"
**Solution:**
1. Verify `APPLE_CLIENT_ID` matches iOS Bundle ID exactly
2. Check Apple Developer portal has Sign in with Apple enabled
3. Ensure identity token is fresh (10 minute expiry)

### Issue: Session token expired
**Solution:**
1. Current JWT expires in 30 days
2. iOS should handle by showing SignInView
3. User re-authenticates with Apple to get new token
