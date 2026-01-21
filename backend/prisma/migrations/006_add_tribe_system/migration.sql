-- CreateTable
CREATE TABLE "grocery_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tribes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribe_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tribe_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invited_by" UUID NOT NULL,
    "invited_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "accepted_at" TIMESTAMPTZ,
    "left_at" TIMESTAMPTZ,
    "management_scope" TEXT NOT NULL DEFAULT 'only_shared',
    "proposal_notifications" BOOLEAN NOT NULL DEFAULT true,
    "digest_notifications" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tribe_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribe_member_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "can_add_tasks" BOOLEAN NOT NULL DEFAULT true,
    "can_remove_tasks" BOOLEAN NOT NULL DEFAULT false,
    "can_add_routines" BOOLEAN NOT NULL DEFAULT true,
    "can_remove_routines" BOOLEAN NOT NULL DEFAULT false,
    "can_add_appointments" BOOLEAN NOT NULL DEFAULT true,
    "can_remove_appointments" BOOLEAN NOT NULL DEFAULT false,
    "can_add_groceries" BOOLEAN NOT NULL DEFAULT true,
    "can_remove_groceries" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tribe_member_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribe_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tribe_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tribe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribe_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "state_changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "notified_at" TIMESTAMPTZ,

    CONSTRAINT "tribe_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tribe_members_tribe_id_user_id_key" ON "tribe_members"("tribe_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tribe_member_permissions_member_id_key" ON "tribe_member_permissions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "tribe_proposals_item_id_recipient_id_key" ON "tribe_proposals"("item_id", "recipient_id");

-- CreateIndex
CREATE INDEX "tribe_proposals_recipient_id_state_idx" ON "tribe_proposals"("recipient_id", "state");

-- AddForeignKey
ALTER TABLE "tribe_members" ADD CONSTRAINT "tribe_members_tribe_id_fkey" FOREIGN KEY ("tribe_id") REFERENCES "tribes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tribe_member_permissions" ADD CONSTRAINT "tribe_member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "tribe_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tribe_items" ADD CONSTRAINT "tribe_items_tribe_id_fkey" FOREIGN KEY ("tribe_id") REFERENCES "tribes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tribe_proposals" ADD CONSTRAINT "tribe_proposals_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "tribe_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tribe_proposals" ADD CONSTRAINT "tribe_proposals_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "tribe_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
