# helpem Monorepo

Single monorepo for iOS, web, and backend.

## Structure

- `ios` – Xcode project (SwiftUI + WebView)
- `web` – Next.js web app (Vercel)
- `backend` – Express API (Railway)
- `packages` – shared contracts/types
- `infra` – infrastructure notes and archives

## Quickstart

### Web
```
cd web
npm install
npm run dev
```

### Backend
```
cd backend
npm install
npm start
```

### iOS
Open `ios/helpemApp.xcodeproj` in Xcode.

## Deployment

- Web: Vercel (GitHub integration)
- Backend: Railway (GitHub integration)
- iOS: Xcode Archive -> TestFlight

### Railway backend deploy (secure)

Use Railway's **internal** Postgres `DATABASE_URL` and run migrations on deploy.

**Configuration:** See `railway.json` in repo root.

**Build:** `npm install -w backend --omit=dev --no-audit --no-fund --cache /tmp/npm-cache`

**Deploy/Start:** `npm run -w backend prisma:migrate && npm run -w backend start`

**Required Railway environment variables:**
- `DATABASE_URL` (internal Railway Postgres URL: `postgres.railway.internal`)
- `JWT_SECRET` (min 32 characters, must match web)
- `APPLE_CLIENT_ID` (iOS Bundle ID: `com.helpem.agent`)
- `NIXPACKS_NODE_VERSION=22.12.0` (Prisma 7 requirement)

See `ENVIRONMENT_VARIABLES.md` for complete reference.

## Auth

- Sign in with Apple only
- Session tokens issued by backend and stored in Keychain
- WebView requests include Authorization header
# trigger-deploy
