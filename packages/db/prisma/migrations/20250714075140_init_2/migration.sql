/*
  Warnings:

  - You are about to drop the `JoinedRooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Spacetype" AS ENUM ('private', 'public', 'invite_only');

-- DropForeignKey
ALTER TABLE "JoinedRooms" DROP CONSTRAINT "JoinedRooms_roomId_fkey";

-- DropForeignKey
ALTER TABLE "JoinedRooms" DROP CONSTRAINT "JoinedRooms_userId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_adminId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "avatar" SET DEFAULT 'bob';

-- DropTable
DROP TABLE "JoinedRooms";

-- DropTable
DROP TABLE "Room";

-- CreateTable
CREATE TABLE "Maps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mapPath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "Maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spacePath" TEXT NOT NULL,
    "maxParticipants" INTEGER,
    "type" "Spacetype" NOT NULL DEFAULT 'public',
    "adminId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JoinedSpaces" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JoinedSpaces_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Maps_name_key" ON "Maps"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Space_mapId_key" ON "Space"("mapId");

-- CreateIndex
CREATE INDEX "_JoinedSpaces_B_index" ON "_JoinedSpaces"("B");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JoinedSpaces" ADD CONSTRAINT "_JoinedSpaces_A_fkey" FOREIGN KEY ("A") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JoinedSpaces" ADD CONSTRAINT "_JoinedSpaces_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
