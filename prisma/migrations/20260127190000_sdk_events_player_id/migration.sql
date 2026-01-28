-- Phase 9 follow-up: indexable playerId for history queries

ALTER TABLE "sdk_events"
  ADD COLUMN IF NOT EXISTS "player_id" TEXT;

CREATE INDEX IF NOT EXISTS "sdk_events_game_id_player_id_received_at_idx"
  ON "sdk_events"("game_id", "player_id", "received_at");
