-- AlterTable
ALTER TABLE "Joblocation" ADD COLUMN     "homeOwnerId" INTEGER;
-- AlterTable
ALTER TABLE "Jobsite" ADD COLUMN     "homeOwnerId" INTEGER;
-- AddForeignKey
ALTER TABLE "Joblocation" ADD CONSTRAINT "Joblocation_homeOwnerId_fkey" FOREIGN KEY ("homeOwnerId") REFERENCES "HomeOwners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Jobsite" ADD CONSTRAINT "Jobsite_homeOwnerId_fkey" FOREIGN KEY ("homeOwnerId") REFERENCES "HomeOwners"("id") ON DELETE SET NULL ON UPDATE CASCADE;