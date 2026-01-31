-- AlterTable: Add sellerTermsConditions to SiteConfig
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "sellerTermsConditions" TEXT;

-- AlterTable: Change SellerProfile default status to PRE_REGISTER
ALTER TABLE "SellerProfile" ALTER COLUMN "status" SET DEFAULT 'PRE_REGISTER';
