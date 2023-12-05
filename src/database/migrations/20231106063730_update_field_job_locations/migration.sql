-- DropForeignKey
ALTER TABLE "Joblocation" DROP CONSTRAINT "Joblocation_inactiveById_fkey";
-- AlterTable
ALTER TABLE "Joblocation" ALTER COLUMN "inactiveById" DROP NOT NULL;
-- AddForeignKey
ALTER TABLE "Joblocation" ADD CONSTRAINT "Joblocation_inactiveById_fkey" FOREIGN KEY ("inactiveById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;