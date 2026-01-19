-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "tags" TEXT,
    "system" TEXT NOT NULL DEFAULT 'STANDARD',
    "storyIntro" TEXT,
    "storyMid" TEXT,
    "storyEnd" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("coverImage", "createdAt", "creatorId", "description", "id", "isPublished", "price", "storyEnd", "storyIntro", "storyMid", "tags", "title", "updatedAt") SELECT "coverImage", "createdAt", "creatorId", "description", "id", "isPublished", "price", "storyEnd", "storyIntro", "storyMid", "tags", "title", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE TABLE "new_GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "joinCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "currentSceneId" TEXT,
    "activeNpcs" TEXT,
    "isAiGm" BOOLEAN NOT NULL DEFAULT false,
    "campaignId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GameSession" ("activeNpcs", "campaignId", "createdAt", "currentSceneId", "id", "isAiGm", "joinCode", "status", "updatedAt") SELECT "activeNpcs", "campaignId", "createdAt", "currentSceneId", "id", "isAiGm", "joinCode", "status", "updatedAt" FROM "GameSession";
DROP TABLE "GameSession";
ALTER TABLE "new_GameSession" RENAME TO "GameSession";
CREATE UNIQUE INDEX "GameSession_joinCode_key" ON "GameSession"("joinCode");
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "sheetType" TEXT NOT NULL DEFAULT 'STANDARD',
    "characterData" TEXT,
    "preGenId" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("characterData", "createdAt", "id", "isReady", "name", "preGenId", "role", "sessionId") SELECT "characterData", "createdAt", "id", "isReady", "name", "preGenId", "role", "sessionId" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE TABLE "new_PreGenCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "sheetType" TEXT NOT NULL DEFAULT 'STANDARD',
    "stats" TEXT,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "PreGenCharacter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PreGenCharacter" ("avatarUrl", "bio", "campaignId", "id", "name", "stats") SELECT "avatarUrl", "bio", "campaignId", "id", "name", "stats" FROM "PreGenCharacter";
DROP TABLE "PreGenCharacter";
ALTER TABLE "new_PreGenCharacter" RENAME TO "PreGenCharacter";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
