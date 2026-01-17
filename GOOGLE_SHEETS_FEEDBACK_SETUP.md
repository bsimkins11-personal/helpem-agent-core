# Google Sheets Alpha Feedback Setup

## Overview
Alpha feedback will flow directly from the app into a Google Workspace spreadsheet for easy review and analysis.

---

## Step 1: Create Google Cloud Project & Enable Sheets API

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google Workspace account

### 1.2 Create New Project
1. Click project dropdown (top left)
2. Click "New Project"
3. Name it: `HelpEm Alpha Feedback`
4. Click "Create"

### 1.3 Enable Google Sheets API
1. Go to: https://console.cloud.google.com/apis/library
2. Search for "Google Sheets API"
3. Click on it
4. Click "Enable"

---

## Step 2: Create Service Account

### 2.1 Navigate to Service Accounts
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Make sure "HelpEm Alpha Feedback" project is selected

### 2.2 Create Service Account
1. Click "+ CREATE SERVICE ACCOUNT"
2. Fill in:
   - **Service account name:** `helpem-feedback-writer`
   - **Service account ID:** (auto-filled)
   - **Description:** "Writes alpha feedback to Google Sheets"
3. Click "CREATE AND CONTINUE"
4. **Grant access:** Skip this (click "CONTINUE")
5. Click "DONE"

### 2.3 Create Service Account Key
1. Click on the service account you just created
2. Go to "KEYS" tab
3. Click "ADD KEY" → "Create new key"
4. Select **JSON** format
5. Click "CREATE"
6. **File will download** - save it as `helpem-service-account.json`

---

## Step 3: Create Google Sheet

### 3.1 Create New Sheet
1. Go to: https://docs.google.com/spreadsheets/
2. Click "+ Blank" to create new sheet
3. Name it: **"HelpEm Alpha Feedback"**

### 3.2 Set Up Columns (Row 1)
Add these headers:
- **A1:** `Timestamp`
- **B1:** `User ID`
- **C1:** `User Email`
- **D1:** `Feedback Category`
- **E1:** `Feedback`
- **F1:** `Page URL`
- **G1:** `User Agent`
- **H1:** `Session ID`

### 3.3 Get Sheet ID
- Look at the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
- Copy the **SHEET_ID_HERE** part
- Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### 3.4 Share Sheet with Service Account
1. Click "Share" button (top right)
2. Paste the service account email:
   - Format: `helpem-feedback-writer@helpem-alpha-feedback.iam.gserviceaccount.com`
   - (Find this in the downloaded JSON file: `client_email` field)
3. Set role: **Editor**
4. **Uncheck** "Notify people"
5. Click "Share"

---

## Step 4: Add Credentials to Backend

### 4.1 Save Service Account JSON
1. Move `helpem-service-account.json` to a safe location (NOT in git repo)
2. Open the file and copy the entire contents

### 4.2 Add to .env (Local Development)
```bash
# Google Sheets Feedback Integration
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
GOOGLE_SHEETS_SPREADSHEET_ID='YOUR_SHEET_ID_HERE'
```

**Important:** 
- The JSON must be on ONE line (no line breaks)
- Must be wrapped in single quotes

### 4.3 Add to Vercel (Production)
```bash
cd /Users/avpuser/HelpEm_POC
vercel env add GOOGLE_SHEETS_CREDENTIALS
# Paste the entire JSON (one line)

vercel env add GOOGLE_SHEETS_SPREADSHEET_ID
# Paste your sheet ID
```

---

## Step 5: Install Dependencies

```bash
cd /Users/avpuser/HelpEm_POC/web
npm install googleapis
```

---

## Step 6: Test Access

Once the API is built, test it:

```bash
curl -X POST https://helpem.ai/api/alpha-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "category": "bug",
    "feedback": "Test feedback from API",
    "pageUrl": "/app"
  }'
```

Check your Google Sheet - new row should appear!

---

## Security Notes

✅ **Service account credentials are safe to use:**
- Only has access to the specific sheet you shared
- Cannot access your entire Google Workspace
- Can be revoked anytime from Google Cloud Console

❌ **NEVER commit credentials to git:**
- `.env` is already in `.gitignore`
- Service account JSON should NEVER be in repo
- Use environment variables for all secrets

---

## Spreadsheet Format

### Example Data:
```
Timestamp            | User ID  | User Email       | Category | Feedback                | Page URL | User Agent | Session ID
2026-01-17 10:30:45 | demo_123 | user@example.com | bug      | Calendar not loading   | /app     | Mozilla... | sess_abc
2026-01-17 10:45:12 | demo_456 | user2@example.com| feature  | Want dark mode         | /app     | Chrome...  | sess_xyz
```

---

## Next Steps

1. ✅ Complete Steps 1-4 above
2. ✅ Provide credentials to agent
3. ✅ Agent will build the API integration
4. ✅ Agent will build the UI (banner + modal)
5. ✅ Test and deploy

---

**Ready? Complete Steps 1-4 and let me know when you have:**
- Service account JSON file
- Google Sheet ID
- Service account email added to sheet with Editor access
