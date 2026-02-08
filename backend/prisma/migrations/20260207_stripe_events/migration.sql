-- Stripe webhook event tracking (idempotency)
CREATE TABLE "stripe_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_events_event_id_key" ON "stripe_events"("event_id");
CREATE INDEX "stripe_events_event_type_idx" ON "stripe_events"("event_type");
