/*
  Warnings:

  - You are about to drop the column `status` on the `membership_dues` table. All the data in the column will be lost.
  - Made the column `paid_at` on table `membership_dues` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "membership_dues" DROP COLUMN "status",
ALTER COLUMN "paid_at" SET NOT NULL;
