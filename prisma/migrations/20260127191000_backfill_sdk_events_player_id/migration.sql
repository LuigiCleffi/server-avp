-- Backfill sdk_events.player_id from payload for existing rows
-- Only updates rows where payload has a non-empty playerId.

UPDATE "sdk_events" e
SET "player_id" = NULLIF(e."payload"->>'playerId', '')
WHERE e."player_id" IS NULL
  AND jsonb_typeof(e."payload") = 'object'
  AND (e."payload" ? 'playerId')
  AND NULLIF(e."payload"->>'playerId', '') IS NOT NULL;
