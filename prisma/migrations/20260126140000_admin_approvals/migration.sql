-- Add enum value
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GAME_CREATOR';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
CREATE TYPE "CreatorRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "creator_requests" (
    "id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "status" "CreatorRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_requests_requested_by_id_key" ON "creator_requests"("requested_by_id");

-- AddForeignKey
ALTER TABLE "creator_requests" ADD CONSTRAINT "creator_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_requests" ADD CONSTRAINT "creator_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
