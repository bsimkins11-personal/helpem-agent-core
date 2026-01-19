# Create Feedback Table in Railway

## ✅ Status: Ready to Run

The migration endpoint has been deployed to Railway.

## 🚀 How to Create the Feedback Table

### Option 1: Via Web Browser (Easiest)

1. **Wait for Railway deployment to complete** (~2-3 minutes)
   - Check: https://railway.app/project/your-project/deployments

2. **Visit the migration endpoint:**
   ```
   https://helpem-agent-core-production.up.railway.app/migrate-feedback
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Feedback table created successfully",
     "columns": [
       { "column_name": "id", "data_type": "uuid" },
       { "column_name": "user_id", "data_type": "character varying" },
       { "column_name": "message_id", "data_type": "character varying" },
       { "column_name": "feedback", "data_type": "character varying" },
       { "column_name": "user_message", "data_type": "text" },
       { "column_name": "assistant_response", "data_type": "text" },
       { "column_name": "action_type", "data_type": "character varying" },
       { "column_name": "action_data", "data_type": "jsonb" },
       { "column_name": "correction", "data_type": "text" },
       { "column_name": "created_at", "data_type": "timestamp with time zone" }
     ]
   }
   ```

4. **If table already exists:**
   ```json
   {
     "success": true,
     "message": "Feedback table already exists",
     "alreadyExists": true
   }
   ```

### Option 2: Via cURL

```bash
curl https://helpem-agent-core-production.up.railway.app/migrate-feedback
```

### Option 3: Via Railway CLI (if you prefer)

```bash
cd backend
railway run node scripts/create-feedback-table.js
```

## 📋 What Gets Created

### Table: `feedback`
- `id` (UUID) - Primary key
- `user_id` (VARCHAR) - User who gave feedback
- `message_id` (VARCHAR) - Message being rated
- `feedback` (VARCHAR) - 'up' or 'down'
- `user_message` (TEXT) - Original user input
- `assistant_response` (TEXT) - AI response
- `action_type` (VARCHAR) - Type of action (todo, appointment, habit, grocery)
- `action_data` (JSONB) - Full action data
- `correction` (TEXT) - User's correction explanation (for thumbs down)
- `created_at` (TIMESTAMP) - When feedback was given

### Indexes Created:
- `idx_feedback_user` - Fast lookups by user
- `idx_feedback_type` - Filter by up/down
- `idx_feedback_action` - Filter by action type
- `idx_feedback_created` - Sort by date
- `idx_feedback_has_correction` - Find feedback with corrections

## ✅ After Migration

Once the table is created:

1. **Thumbs up/down buttons will work** in the app
2. **Feedback will be stored** in the database
3. **No more 500 errors** on the `/api/feedback` endpoint
4. **RLHF system is fully operational**

## 🔍 Verify Table Creation

You can verify the table was created by checking the Railway database:

1. Go to Railway dashboard
2. Open your Postgres service
3. Click "Data" tab
4. Look for the `feedback` table

## 🐛 Troubleshooting

### If you get a 500 error:
- Check Railway deployment logs
- Ensure DATABASE_URL is set correctly
- Check that the migration SQL syntax is valid

### If table already exists:
- That's fine! The migration is idempotent
- You'll get a success message saying it already exists

### If you need to reset:
```sql
DROP TABLE IF EXISTS feedback CASCADE;
```
Then run the migration again.

## 📝 Notes

- The migration endpoint is safe to call multiple times
- It checks if the table exists before creating it
- All indexes are created with `IF NOT EXISTS` for safety
- The endpoint is publicly accessible (no auth required for setup)
