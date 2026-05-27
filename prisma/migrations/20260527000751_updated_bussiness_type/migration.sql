/*
  Warnings:

  - The values [RESTAURANT,CAFE,BAKERY,MANUFACTURING,SERVICE,HOSPITAL,CLINIC,AGRICULTURE] on the enum `OrganizationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrganizationType_new" AS ENUM ('RETAIL', 'WHOLESALE', 'GROCERY', 'SUPERMARKET', 'PHARMACY', 'ELECTRONICS', 'FASHION', 'HARDWARE', 'BEAUTY', 'BOOKSTORE', 'STATIONERY', 'AUTO_PARTS', 'MOBILE_SHOP', 'FURNITURE', 'WAREHOUSE', 'DISTRIBUTION', 'ECOMMERCE', 'OTHER');
ALTER TABLE "Organization" ALTER COLUMN "organizationType" TYPE "OrganizationType_new" USING ("organizationType"::text::"OrganizationType_new");
ALTER TYPE "OrganizationType" RENAME TO "OrganizationType_old";
ALTER TYPE "OrganizationType_new" RENAME TO "OrganizationType";
DROP TYPE "OrganizationType_old";
COMMIT;
