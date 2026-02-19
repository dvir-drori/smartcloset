-- CreateTable
CREATE TABLE "TryOnResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bodyPhotoId" TEXT NOT NULL,
    "clothingItemId" TEXT NOT NULL,
    "resultImageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TryOnResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TryOnResult_bodyPhotoId_fkey" FOREIGN KEY ("bodyPhotoId") REFERENCES "BodyPhoto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TryOnResult_clothingItemId_fkey" FOREIGN KEY ("clothingItemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TryOnResult_userId_idx" ON "TryOnResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TryOnResult_bodyPhotoId_clothingItemId_key" ON "TryOnResult"("bodyPhotoId", "clothingItemId");
