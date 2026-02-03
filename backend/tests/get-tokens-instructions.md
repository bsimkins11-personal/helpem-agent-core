# How to Get Test Tokens for Authenticated Tests

Since test tokens require the JWT_SECRET (which is stored securely in Railway), there are two ways to get valid tokens:

## Option 1: Use Railway CLI (Requires Service Link)

```bash
# Link to the API service first
railway link -s helpem-backend

# Then run with Railway environment
railway run node tests/get-test-tokens.js
```

## Option 2: Get Tokens from iOS App (Development Build)

1. Build the iOS app in Debug mode
2. Sign in with your test accounts
3. The app stores tokens in Keychain
4. Use a debug view or breakpoint to capture the token

## Option 3: Use Railway Dashboard

1. Go to Railway Dashboard > helpem-agent-core > Settings
2. Copy the JWT_SECRET and DATABASE_URL values
3. Create a local `.env.test` file:
   ```
   DATABASE_URL="<paste from Railway>"
   JWT_SECRET="<paste from Railway>"
   ```
4. Run: `dotenv -e .env.test node tests/get-test-tokens.js`

## Running Authenticated Tests

Once you have tokens, run:
```bash
TEST_ADMIN_TOKEN="<token1>" \
TEST_MEMBER_TOKEN="<token2>" \
node tests/tribe-authenticated-tests.js
```
