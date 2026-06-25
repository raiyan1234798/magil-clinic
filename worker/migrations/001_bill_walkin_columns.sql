-- Billing upgrade: walk-in customers, discounts (ea39070)
ALTER TABLE "Bill" ADD COLUMN "walkInName" TEXT;
ALTER TABLE "Bill" ADD COLUMN "walkInPhone" TEXT;
ALTER TABLE "Bill" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bill" ADD COLUMN "discountPercent" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN "discountAmount" REAL NOT NULL DEFAULT 0;
