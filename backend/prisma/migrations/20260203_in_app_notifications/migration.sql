CREATE TABLE "in_app_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "read_at" TIMESTAMP(3),
  CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "in_app_notifications_user_id_created_at_idx" ON "in_app_notifications" ("user_id", "created_at");
CREATE INDEX "in_app_notifications_user_id_read_at_idx" ON "in_app_notifications" ("user_id", "read_at");

ALTER TABLE "in_app_notifications"
  ADD CONSTRAINT "in_app_notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
