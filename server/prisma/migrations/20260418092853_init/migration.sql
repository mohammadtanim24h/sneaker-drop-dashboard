-- CreateEnum
CREATE TYPE "DropStatus" AS ENUM ('UPCOMING', 'LIVE', 'ENDED');

-- CreateTable
CREATE TABLE "Sneaker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sneaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drop" (
    "id" TEXT NOT NULL,
    "sneakerId" TEXT NOT NULL,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "totalStock" INTEGER NOT NULL,
    "availableStock" INTEGER NOT NULL,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "soldStock" INTEGER NOT NULL DEFAULT 0,
    "status" "DropStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Drop_status_releaseAt_idx" ON "Drop"("status", "releaseAt");

-- AddForeignKey
ALTER TABLE "Drop" ADD CONSTRAINT "Drop_sneakerId_fkey" FOREIGN KEY ("sneakerId") REFERENCES "Sneaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
