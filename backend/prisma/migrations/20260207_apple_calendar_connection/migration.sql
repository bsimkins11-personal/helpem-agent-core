-- CreateTable
CREATE TABLE "apple_calendar_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "apple_email" TEXT NOT NULL,
    "app_password" TEXT NOT NULL,
    "caldav_url" TEXT,
    "principal_url" TEXT,
    "last_synced_at" TIMESTAMPTZ,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "apple_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apple_calendar_connections_user_id_key" ON "apple_calendar_connections"("user_id");
