-- Phase 9: SDK Data Ingestion (Events -> Postgres)

-- CreateTable
CREATE TABLE IF NOT EXISTS "sdk_request_nonces" (
  "id" UUID NOT NULL,
  "api_key_id" UUID NOT NULL,
  "nonce" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sdk_request_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sdk_request_nonces_api_key_id_nonce_key" ON "sdk_request_nonces"("api_key_id", "nonce");

-- AddForeignKey
ALTER TABLE "sdk_request_nonces"
  ADD CONSTRAINT "sdk_request_nonces_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "game_api_keys"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE IF NOT EXISTS "sdk_events" (
  "id" UUID NOT NULL,
  "game_id" UUID NOT NULL,
  "api_key_id" UUID NOT NULL,
  "event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sdk_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sdk_events_game_id_event_id_key" ON "sdk_events"("game_id", "event_id");
CREATE INDEX IF NOT EXISTS "sdk_events_game_id_received_at_idx" ON "sdk_events"("game_id", "received_at");

-- AddForeignKey
ALTER TABLE "sdk_events"
  ADD CONSTRAINT "sdk_events_game_id_fkey"
  FOREIGN KEY ("game_id") REFERENCES "games"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sdk_events"
  ADD CONSTRAINT "sdk_events_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "game_api_keys"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
