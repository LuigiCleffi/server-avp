-- CreateEnum
CREATE TYPE "TournamentPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "tournament_purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "status" "TournamentPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider",
    "external_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_purchases_user_id_tournament_id_key" ON "tournament_purchases"("user_id", "tournament_id");

-- CreateIndex
CREATE INDEX "tournament_purchases_tournament_id_status_idx" ON "tournament_purchases"("tournament_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_purchases_external_id_key" ON "tournament_purchases"("external_id");

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN "tournament_purchase_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_tournament_purchase_id_key" ON "ledger_entries"("tournament_purchase_id");

-- AddForeignKey
ALTER TABLE "tournament_purchases" ADD CONSTRAINT "tournament_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_purchases" ADD CONSTRAINT "tournament_purchases_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tournament_purchase_id_fkey" FOREIGN KEY ("tournament_purchase_id") REFERENCES "tournament_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
