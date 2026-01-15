-- Create table for global instruction rules
CREATE TABLE "global_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "global_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "global_rules_key_key" UNIQUE ("key")
);
