-- Create table for per-user instruction data
CREATE TABLE "user_instructions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "user_instructions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_instructions_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "user_instructions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
