-- Cravou! Copa 2026 — Adiciona apenas as tabelas novas, sem tocar nas existentes

CREATE TABLE IF NOT EXISTS "CravouMatch" (
    "id"                TEXT        NOT NULL,
    "externalId"        TEXT        NOT NULL,
    "phase"             TEXT        NOT NULL,
    "groupName"         TEXT,
    "homeTeam"          TEXT        NOT NULL,
    "awayTeam"          TEXT        NOT NULL,
    "homeScore"         INTEGER,
    "awayScore"         INTEGER,
    "matchDate"         TIMESTAMP(3) NOT NULL,
    "stadium"           TEXT,
    "status"            TEXT        NOT NULL DEFAULT 'upcoming',
    "predictionsLocked" BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CravouMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CravouMatch_externalId_key" ON "CravouMatch"("externalId");

CREATE TABLE IF NOT EXISTS "CravouPrediction" (
    "id"        TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "matchId"   TEXT        NOT NULL,
    "homeScore" INTEGER     NOT NULL,
    "awayScore" INTEGER     NOT NULL,
    "points"    INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CravouPrediction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CravouPrediction_userId_matchId_key" ON "CravouPrediction"("userId", "matchId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CravouPrediction_matchId_fkey'
  ) THEN
    ALTER TABLE "CravouPrediction"
      ADD CONSTRAINT "CravouPrediction_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "CravouMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CravouGroup" (
    "id"          TEXT        NOT NULL,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "inviteCode"  TEXT        NOT NULL,
    "ownerId"     TEXT        NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CravouGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CravouGroup_inviteCode_key" ON "CravouGroup"("inviteCode");

CREATE TABLE IF NOT EXISTS "CravouGroupMember" (
    "id"       TEXT        NOT NULL,
    "groupId"  TEXT        NOT NULL,
    "userId"   TEXT        NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CravouGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CravouGroupMember_groupId_userId_key" ON "CravouGroupMember"("groupId", "userId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CravouGroupMember_groupId_fkey'
  ) THEN
    ALTER TABLE "CravouGroupMember"
      ADD CONSTRAINT "CravouGroupMember_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "CravouGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CravouGroup' AND column_name = 'brazilOnly'
  ) THEN
    ALTER TABLE "CravouGroup" ADD COLUMN "brazilOnly" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
