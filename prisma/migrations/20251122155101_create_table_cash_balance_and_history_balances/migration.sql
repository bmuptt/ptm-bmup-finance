-- CreateTable
CREATE TABLE "cash_balance" (
    "balance" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "cash_balance_pkey" PRIMARY KEY ("balance")
);

-- CreateTable
CREATE TABLE "history_balances" (
    "id" SERIAL NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "value" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_balances_pkey" PRIMARY KEY ("id")
);
