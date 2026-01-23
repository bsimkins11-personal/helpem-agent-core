-- Add tribe messaging table
CREATE TABLE IF NOT EXISTS "tribe_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tribe_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "edited_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tribe_messages_pkey" PRIMARY KEY ("id")
);

-- Add tribe tracking to personal items
DO $$ BEGIN
    -- Appointments
    ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "added_by_tribe_id" UUID;
    ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "added_by_tribe_name" TEXT;
    ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "origin_tribe_item_id" UUID;
    ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "origin_tribe_proposal_id" UUID;
    
    -- Todos
    ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "added_by_tribe_id" UUID;
    ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "added_by_tribe_name" TEXT;
    ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "origin_tribe_item_id" UUID;
    ALTER TABLE "todos" ADD COLUMN IF NOT EXISTS "origin_tribe_proposal_id" UUID;
    
    -- Habits
    ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "added_by_tribe_id" UUID;
    ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "added_by_tribe_name" TEXT;
    ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "origin_tribe_item_id" UUID;
    ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "origin_tribe_proposal_id" UUID;
    
    -- Grocery Items
    ALTER TABLE "grocery_items" ADD COLUMN IF NOT EXISTS "added_by_tribe_id" UUID;
    ALTER TABLE "grocery_items" ADD COLUMN IF NOT EXISTS "added_by_tribe_name" TEXT;
    ALTER TABLE "grocery_items" ADD COLUMN IF NOT EXISTS "origin_tribe_item_id" UUID;
    ALTER TABLE "grocery_items" ADD COLUMN IF NOT EXISTS "origin_tribe_proposal_id" UUID;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Columns already exist.';
END $$;

-- Add personal item permissions table
CREATE TABLE IF NOT EXISTS "tribe_member_personal_item_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    
    -- Can tribe add items to my personal lists?
    "tribe_can_add_to_my_appointments" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_add_to_my_todos" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_add_to_my_routines" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_add_to_my_groceries" BOOLEAN NOT NULL DEFAULT false,
    
    -- Can tribe remove items from my personal lists?
    "tribe_can_remove_from_my_appointments" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_remove_from_my_todos" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_remove_from_my_routines" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_remove_from_my_groceries" BOOLEAN NOT NULL DEFAULT false,
    
    -- Can tribe update items in my personal lists?
    "tribe_can_update_my_appointments" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_update_my_todos" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_update_my_routines" BOOLEAN NOT NULL DEFAULT false,
    "tribe_can_update_my_groceries" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tribe_member_personal_item_permissions_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "tribe_messages_tribe_id_created_at_idx" ON "tribe_messages"("tribe_id", "created_at");
CREATE INDEX IF NOT EXISTS "appointments_user_id_added_by_tribe_id_idx" ON "appointments"("user_id", "added_by_tribe_id");
CREATE INDEX IF NOT EXISTS "appointments_user_id_origin_tribe_item_id_idx" ON "appointments"("user_id", "origin_tribe_item_id");
CREATE INDEX IF NOT EXISTS "todos_user_id_added_by_tribe_id_idx" ON "todos"("user_id", "added_by_tribe_id");
CREATE INDEX IF NOT EXISTS "todos_user_id_origin_tribe_item_id_idx" ON "todos"("user_id", "origin_tribe_item_id");
CREATE INDEX IF NOT EXISTS "habits_user_id_added_by_tribe_id_idx" ON "habits"("user_id", "added_by_tribe_id");
CREATE INDEX IF NOT EXISTS "habits_user_id_origin_tribe_item_id_idx" ON "habits"("user_id", "origin_tribe_item_id");
CREATE INDEX IF NOT EXISTS "grocery_items_user_id_added_by_tribe_id_idx" ON "grocery_items"("user_id", "added_by_tribe_id");
CREATE INDEX IF NOT EXISTS "grocery_items_user_id_origin_tribe_item_id_idx" ON "grocery_items"("user_id", "origin_tribe_item_id");

-- Add foreign keys
DO $$ BEGIN
    ALTER TABLE "tribe_messages" ADD CONSTRAINT "tribe_messages_tribe_id_fkey" 
        FOREIGN KEY ("tribe_id") REFERENCES "tribes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'Foreign key already exists.';
END $$;

DO $$ BEGIN
    ALTER TABLE "tribe_member_personal_item_permissions" ADD CONSTRAINT "tribe_member_personal_item_permissions_member_id_fkey" 
        FOREIGN KEY ("member_id") REFERENCES "tribe_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'Foreign key already exists.';
END $$;

-- Add unique constraint
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "tribe_member_personal_item_permissions_member_id_key" 
        ON "tribe_member_personal_item_permissions"("member_id");
EXCEPTION
    WHEN duplicate_table THEN RAISE NOTICE 'Index already exists.';
END $$;
