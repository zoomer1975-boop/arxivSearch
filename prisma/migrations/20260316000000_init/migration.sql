-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertMethod" AS ENUM ('EMAIL', 'TELEGRAM', 'BOTH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "institution" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "telegramChatId" TEXT,
    "alertMethod" "AlertMethod" NOT NULL DEFAULT 'EMAIL',
    "alertTime" TEXT NOT NULL DEFAULT '09:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "UserCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKeyword" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,

    CONSTRAINT "UserKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedPaper" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arxivId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matchedKeywords" TEXT NOT NULL,
    "matchedCategory" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperCache" (
    "id" TEXT NOT NULL,
    "arxivId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "htmlContent" TEXT,
    "summary" TEXT,
    "summaryKo" TEXT,
    "translatedSections" TEXT,
    "references" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queriesRun" INTEGER NOT NULL,
    "papersFound" INTEGER NOT NULL,
    "alertsSent" INTEGER NOT NULL,
    "errors" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "UserCategory_userId_category_key" ON "UserCategory"("userId", "category");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "UserKeyword_userId_keyword_key" ON "UserKeyword"("userId", "keyword");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "WatchedPaper_userId_arxivId_key" ON "WatchedPaper"("userId", "arxivId");

-- CreateIndex
CREATE INDEX "WatchedPaper_userId_isRead_idx" ON "WatchedPaper"("userId", "isRead");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "PaperCache_arxivId_key" ON "PaperCache"("arxivId");

-- AddForeignKey
ALTER TABLE "UserCategory" ADD CONSTRAINT "UserCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKeyword" ADD CONSTRAINT "UserKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedPaper" ADD CONSTRAINT "WatchedPaper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
