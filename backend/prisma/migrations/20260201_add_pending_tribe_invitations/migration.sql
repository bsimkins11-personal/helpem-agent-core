-- CreateTable
CREATE TABLE "pending_tribe_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tribe_id" UUID NOT NULL,
    "invited_by" UUID NOT NULL,
    "contact_identifier" TEXT NOT NULL,
    "contact_type" TEXT NOT NULL,
    "contact_name" TEXT,
    "inviter_name" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMPTZ,
    "accepted_by" UUID,

    CONSTRAINT "pending_tribe_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_tribe_invitations_tribe_id_contact_identifier_key" ON "pending_tribe_invitations"("tribe_id", "contact_identifier");

-- CreateIndex
CREATE INDEX "pending_tribe_invitations_contact_identifier_state_idx" ON "pending_tribe_invitations"("contact_identifier", "state");

-- CreateIndex
CREATE INDEX "pending_tribe_invitations_tribe_id_state_idx" ON "pending_tribe_invitations"("tribe_id", "state");

-- CreateIndex
CREATE INDEX "pending_tribe_invitations_expires_at_state_idx" ON "pending_tribe_invitations"("expires_at", "state");
