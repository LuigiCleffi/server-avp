-- Add external tournament manager id linkage
ALTER TABLE "tournaments" ADD COLUMN "tournament_manager_id" TEXT;

-- Optional index for lookups (not unique; upstream ids may not be globally unique across environments)
CREATE INDEX IF NOT EXISTS "tournaments_tournament_manager_id_idx" ON "tournaments"("tournament_manager_id");
