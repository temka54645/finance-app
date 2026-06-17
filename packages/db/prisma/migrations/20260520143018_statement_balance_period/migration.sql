-- Хуулгын period + opening/closing balance metadata
ALTER TABLE "Statement"
  ADD COLUMN "periodStart"    TIMESTAMP(3),
  ADD COLUMN "periodEnd"      TIMESTAMP(3),
  ADD COLUMN "openingBalance" DOUBLE PRECISION,
  ADD COLUMN "closingBalance" DOUBLE PRECISION;

CREATE INDEX "Statement_userId_periodEnd_idx" ON "Statement"("userId", "periodEnd");
