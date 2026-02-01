-- CreateTable
CREATE TABLE "tribe_member_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tribe_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_user_id" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by" UUID,

    CONSTRAINT "tribe_member_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tribe_member_requests_tribe_id_requested_user_id_state_key" ON "tribe_member_requests"("tribe_id", "requested_user_id", "state");

-- CreateIndex
CREATE INDEX "tribe_member_requests_tribe_id_state_idx" ON "tribe_member_requests"("tribe_id", "state");

-- AddForeignKey
ALTER TABLE "tribe_member_requests" ADD CONSTRAINT "tribe_member_requests_tribe_id_fkey" FOREIGN KEY ("tribe_id") REFERENCES "tribes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
