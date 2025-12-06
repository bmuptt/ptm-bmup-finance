-- AlterTable
ALTER TABLE "membership_dues" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "membership_dues_member_period_idx" RENAME TO "membership_dues_member_id_period_year_period_month_idx";

-- RenameIndex
ALTER INDEX "membership_dues_member_period_unique" RENAME TO "membership_dues_member_id_period_year_period_month_key";
