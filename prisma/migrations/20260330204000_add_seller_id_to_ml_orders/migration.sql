ALTER TABLE "ml_orders"
ADD COLUMN "seller_id" TEXT NOT NULL DEFAULT '';

CREATE INDEX "ml_orders_seller_id_idx" ON "ml_orders"("seller_id");

ALTER TABLE "ml_orders"
ALTER COLUMN "seller_id" DROP DEFAULT;
