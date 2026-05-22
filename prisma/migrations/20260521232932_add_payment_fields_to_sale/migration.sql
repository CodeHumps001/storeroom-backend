-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOMO', 'CARD');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "amountPaid" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" "PaymentMethod";
