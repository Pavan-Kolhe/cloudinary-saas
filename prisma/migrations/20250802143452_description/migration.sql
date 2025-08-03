/*
  Warnings:

  - You are about to drop the column `discription` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Video" DROP COLUMN "discription",
ADD COLUMN     "description" TEXT;
