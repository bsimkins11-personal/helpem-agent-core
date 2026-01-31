-- Google Calendar Connections
CREATE TABLE IF NOT EXISTS "google_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "token_expires_at" TIMESTAMP NOT NULL,
  "google_email" TEXT NOT NULL,
  "scope" TEXT DEFAULT 'https://www.googleapis.com/auth/calendar',
  "last_synced_at" TIMESTAMP,
  "sync_enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- User Devices for Push Notifications
CREATE TABLE IF NOT EXISTS "user_devices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "device_token" TEXT NOT NULL UNIQUE,
  "platform" TEXT DEFAULT 'ios',
  "device_name" TEXT,
  "notifications_enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "last_active_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_user_devices_user_id" ON "user_devices" ("user_id");

-- Notification Logs
CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "reference_id" TEXT,
  "sent_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_notification_logs_user_type_sent" ON "notification_logs" ("user_id", "type", "sent_at");
CREATE INDEX IF NOT EXISTS "idx_notification_logs_user_ref_type" ON "notification_logs" ("user_id", "reference_id", "type");

-- Tribe Invite Tokens for shareable links
CREATE TABLE IF NOT EXISTS "tribe_invite_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tribe_id" UUID NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "created_by" UUID NOT NULL,
  "max_uses" INT,
  "used_count" INT DEFAULT 0,
  "expires_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_tribe_invite_tokens_token" ON "tribe_invite_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_tribe_invite_tokens_tribe_id" ON "tribe_invite_tokens" ("tribe_id");
