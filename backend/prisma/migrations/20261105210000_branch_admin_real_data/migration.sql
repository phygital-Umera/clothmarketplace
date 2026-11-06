-- Branch expenses (rent, salaries, power) are real Expense rows now instead of
-- a separate table filled with sample data. Ones not charged to a single shop
-- have no shop.
ALTER TABLE "Expense" ALTER COLUMN "shopId" DROP NOT NULL;
CREATE INDEX "Expense_branchId_expenseDate_idx" ON "Expense"("branchId", "expenseDate");

-- Branch pricing edits the real product prices (it used a separate sample
-- table); this records when a price last changed
ALTER TABLE "Product" ADD COLUMN "priceChangedAt" TIMESTAMP(3);
