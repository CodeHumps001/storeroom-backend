-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrganizationType" ADD VALUE 'SUPERMARKET';
ALTER TYPE "OrganizationType" ADD VALUE 'RESTAURANT';
ALTER TYPE "OrganizationType" ADD VALUE 'CAFE';
ALTER TYPE "OrganizationType" ADD VALUE 'BAKERY';
ALTER TYPE "OrganizationType" ADD VALUE 'FASHION';
ALTER TYPE "OrganizationType" ADD VALUE 'HARDWARE';
ALTER TYPE "OrganizationType" ADD VALUE 'BEAUTY';
ALTER TYPE "OrganizationType" ADD VALUE 'BOOKSTORE';
ALTER TYPE "OrganizationType" ADD VALUE 'STATIONERY';
ALTER TYPE "OrganizationType" ADD VALUE 'AUTO_PARTS';
ALTER TYPE "OrganizationType" ADD VALUE 'MOBILE_SHOP';
ALTER TYPE "OrganizationType" ADD VALUE 'FURNITURE';
ALTER TYPE "OrganizationType" ADD VALUE 'WAREHOUSE';
ALTER TYPE "OrganizationType" ADD VALUE 'DISTRIBUTION';
ALTER TYPE "OrganizationType" ADD VALUE 'MANUFACTURING';
ALTER TYPE "OrganizationType" ADD VALUE 'ECOMMERCE';
ALTER TYPE "OrganizationType" ADD VALUE 'SERVICE';
ALTER TYPE "OrganizationType" ADD VALUE 'HOSPITAL';
ALTER TYPE "OrganizationType" ADD VALUE 'CLINIC';
ALTER TYPE "OrganizationType" ADD VALUE 'AGRICULTURE';
