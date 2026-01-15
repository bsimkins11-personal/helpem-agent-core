# HelpEm Monorepo

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
Open `ios/HelpEmApp.xcodeproj` in Xcode.

## Deployment

- Web: Vercel (GitHub integration)
- Backend: Railway (GitHub integration)
- iOS: Xcode Archive -> TestFlight

### Railway backend deploy (secure)

Use Railway's **internal** Postgres `DATABASE_URL` and run migrations on deploy.

Recommended Railway commands:
- Build: `npm ci -w backend`
- Deploy/Start: `npm run -w backend prisma:migrate && npm run -w backend start`

Required Railway environment variables:
- `DATABASE_URL` (internal Railway Postgres URL)
- `JWT_SECRET`
- `APPLE_CLIENT_ID`

## Auth

- Sign in with Apple only
- Session tokens issued by backend and stored in Keychain
- WebView requests include Authorization header
