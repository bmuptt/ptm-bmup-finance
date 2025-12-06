-- CreateTable: membership_dues
CREATE TABLE "membership_dues" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(18,2) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "proof_file_path" TEXT,
    "note" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_dues_pkey" PRIMARY KEY ("id")
);

-- Unique constraint to ensure idempotent inserts
CREATE UNIQUE INDEX "membership_dues_member_period_unique" ON "membership_dues" ("member_id", "period_year", "period_month");

-- Index to speed up queries
CREATE INDEX "membership_dues_member_period_idx" ON "membership_dues" ("member_id", "period_year", "period_month");

