-- CreateTable
CREATE TABLE "PrayerCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralPrayer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralPrayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosarySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RosarySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpiritualStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rosariesPrayed" INTEGER NOT NULL DEFAULT 0,
    "prayersPrayed" INTEGER NOT NULL DEFAULT 0,
    "prayerStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPrayerDate" TIMESTAMP(3),

    CONSTRAINT "SpiritualStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrayerCategory_slug_key" ON "PrayerCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpiritualStats_userId_key" ON "SpiritualStats"("userId");

-- AddForeignKey
ALTER TABLE "GeneralPrayer" ADD CONSTRAINT "GeneralPrayer_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PrayerCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosarySession" ADD CONSTRAINT "RosarySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpiritualStats" ADD CONSTRAINT "SpiritualStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
