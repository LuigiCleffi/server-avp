-- Phase 8: Games ownership + SDK credentials

-- CreateEnum
CREATE TYPE "GameApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "games" ADD COLUMN "created_by_id" UUID;

-- CreateTable
CREATE TABLE "game_api_keys" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "status" "GameApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "game_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_api_keys_client_id_key" ON "game_api_keys"("client_id");

-- CreateIndex
CREATE INDEX "game_api_keys_game_id_status_idx" ON "game_api_keys"("game_id", "status");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_api_keys" ADD CONSTRAINT "game_api_keys_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
