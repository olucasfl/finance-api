-- CreateTable
CREATE TABLE "ConsecrationProgress" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsecrationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsecrationStage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,

    CONSTRAINT "ConsecrationStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsecrationDay" (
    "id" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "stageId" TEXT NOT NULL,

    CONSTRAINT "ConsecrationDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsecrationPrayer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "ConsecrationPrayer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConsecrationProgress" ADD CONSTRAINT "ConsecrationProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsecrationDay" ADD CONSTRAINT "ConsecrationDay_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ConsecrationStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsecrationPrayer" ADD CONSTRAINT "ConsecrationPrayer_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ConsecrationDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
