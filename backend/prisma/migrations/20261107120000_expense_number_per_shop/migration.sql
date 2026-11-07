-- Expense numbers run per shop (EX/26-27/0001 in every shop), so they are unique within a shop, not globally
DROP INDEX IF EXISTS "Expense_expenseNumber_key";
CREATE UNIQUE INDEX "Expense_shopId_expenseNumber_key" ON "Expense"("shopId", "expenseNumber");
