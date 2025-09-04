/*
  Warnings:

  - A unique constraint covering the columns `[mapid]` on the table `Maps` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mapid` to the `Maps` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Maps" ADD COLUMN     "mapid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Maps_mapid_key" ON "Maps"("mapid");
