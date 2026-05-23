-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "paystackCustomerId" TEXT,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "subscriptionExpiry" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE';
