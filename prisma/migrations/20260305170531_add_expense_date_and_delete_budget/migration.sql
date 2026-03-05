-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_userId_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
