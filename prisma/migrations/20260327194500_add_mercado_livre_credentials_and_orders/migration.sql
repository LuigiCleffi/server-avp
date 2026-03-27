-- CreateTable
CREATE TABLE "ml_credentials" (
    "seller_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_credentials_pkey" PRIMARY KEY ("seller_id")
);

-- CreateTable
CREATE TABLE "ml_orders" (
    "order_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "items" JSONB NOT NULL,
    "shipping_id" BIGINT,
    "pack_id" BIGINT,
    "nfe_status" TEXT NOT NULL DEFAULT 'pending',
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateIndex
CREATE INDEX "ml_orders_status_idx" ON "ml_orders"("status");

-- CreateIndex
CREATE INDEX "ml_orders_shipping_id_idx" ON "ml_orders"("shipping_id");

-- CreateIndex
CREATE INDEX "ml_orders_pack_id_idx" ON "ml_orders"("pack_id");

-- CreateIndex
CREATE INDEX "ml_orders_nfe_status_idx" ON "ml_orders"("nfe_status");
