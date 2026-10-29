-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('CART', 'PRODUCT', 'CATEGORY');

-- CreateEnum
CREATE TYPE "DiscountSource" AS ENUM ('COUPON', 'MANUAL');
