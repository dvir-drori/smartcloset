-- CreateTable
CREATE TABLE "BodyPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BodyPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BodyPhoto_userId_idx" ON "BodyPhoto"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyPhoto_userId_angle_key" ON "BodyPhoto"("userId", "angle");
