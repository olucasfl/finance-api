/*
  Warnings:

  - You are about to drop the `ConsecrationPrayer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConsecrationPrayer" DROP CONSTRAINT "ConsecrationPrayer_dayId_fkey";

-- DropTable
DROP TABLE "ConsecrationPrayer";

-- CreateTable
CREATE TABLE "Prayer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "Prayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPrayer" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "dayId" TEXT NOT NULL,
    "prayerId" TEXT NOT NULL,

    CONSTRAINT "DayPrayer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DayPrayer" ADD CONSTRAINT "DayPrayer_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ConsecrationDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPrayer" ADD CONSTRAINT "DayPrayer_prayerId_fkey" FOREIGN KEY ("prayerId") REFERENCES "Prayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
