-- CreateTable
CREATE TABLE "CustomCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomCategory_userId_idx" ON "CustomCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomCategory_userId_userType_type_name_key" ON "CustomCategory"("userId", "userType", "type", "name");

-- AddForeignKey
ALTER TABLE "CustomCategory" ADD CONSTRAINT "CustomCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
