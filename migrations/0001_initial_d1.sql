PRAGMA defer_foreign_keys = ON;

CREATE TABLE "Tool" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "descriptionZh" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "repoUrl" TEXT NOT NULL,
  "homepageUrl" TEXT,
  "npmPackage" TEXT,
  "pypiPackage" TEXT,
  "stars" INTEGER NOT NULL DEFAULT 0,
  "forks" INTEGER NOT NULL DEFAULT 0,
  "openIssues" INTEGER NOT NULL DEFAULT 0,
  "language" TEXT,
  "license" TEXT,
  "lastCommitAt" DATETIME,
  "author" TEXT,
  "version" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "installGuide" JSONB,
  "avgRating" REAL NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "score" REAL,
  "syncedAt" DATETIME,
  "npmDownloads" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ToolTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ToolTag_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ToolTransport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ToolTransport_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ToolFeature" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ToolFeature_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ToolScreenshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ToolScreenshot_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameZh" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionZh" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "Platform" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "configKey" TEXT NOT NULL
);

CREATE TABLE "ToolCategory" (
  "toolId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  PRIMARY KEY ("toolId", "categoryId"),
  CONSTRAINT "ToolCategory_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ToolCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ToolPlatform" (
  "toolId" TEXT NOT NULL,
  "platformId" TEXT NOT NULL,
  PRIMARY KEY ("toolId", "platformId"),
  CONSTRAINT "ToolPlatform_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ToolPlatform_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" DATETIME,
  "image" TEXT,
  "isPro" BOOLEAN NOT NULL DEFAULT false,
  "proNewsletter" BOOLEAN NOT NULL DEFAULT false,
  "proToken" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" DATETIME NOT NULL
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT,
  "platform" TEXT,
  "useCase" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Submission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT,
  "userId" TEXT,
  "repoUrl" TEXT NOT NULL,
  "submitterName" TEXT,
  "submitterEmail" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME,
  CONSTRAINT "Submission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "SubmissionSuggestedTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SubmissionSuggestedTag_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ToolTagVote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "toolId" TEXT NOT NULL,
  "tagSlug" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToolTagVote_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ToolTagVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Favorite_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "NewsletterSubscriber" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "token" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" DATETIME
);

CREATE TABLE "TranslationCache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceHash" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "descriptionZh" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TranslationCacheFeature" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "translationCacheId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TranslationCacheFeature_translationCacheId_fkey" FOREIGN KEY ("translationCacheId") REFERENCES "TranslationCache" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Collection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleZh" TEXT NOT NULL,
  "descriptionEn" TEXT,
  "descriptionZh" TEXT,
  "icon" TEXT,
  "coverImage" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CollectionTool" (
  "collectionId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "noteEn" TEXT,
  "noteZh" TEXT,
  "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("collectionId", "toolId"),
  CONSTRAINT "CollectionTool_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CollectionTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ToolSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToolSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ToolSubscription_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notification_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DigestSend" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "toolCount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "error" TEXT,
  CONSTRAINT "DigestSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SkillSyncState" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  "lastSyncAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalRepos" INTEGER NOT NULL DEFAULT 0,
  "syncedRepos" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "JobRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workflow" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "cursor" TEXT,
  "payload" JSONB,
  "error" TEXT,
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Tool_slug_key" ON "Tool" ("slug");
CREATE INDEX "Tool_type_status_idx" ON "Tool" ("type", "status");
CREATE INDEX "Tool_stars_idx" ON "Tool" ("stars");
CREATE INDEX "Tool_lastCommitAt_idx" ON "Tool" ("lastCommitAt");
CREATE INDEX "Tool_isFeatured_idx" ON "Tool" ("isFeatured");
CREATE INDEX "Tool_name_idx" ON "Tool" ("name");
CREATE INDEX "Tool_score_idx" ON "Tool" ("score");

CREATE UNIQUE INDEX "ToolTag_toolId_value_key" ON "ToolTag" ("toolId", "value");
CREATE INDEX "ToolTag_toolId_idx" ON "ToolTag" ("toolId");
CREATE INDEX "ToolTag_value_idx" ON "ToolTag" ("value");
CREATE UNIQUE INDEX "ToolTransport_toolId_value_key" ON "ToolTransport" ("toolId", "value");
CREATE INDEX "ToolTransport_toolId_idx" ON "ToolTransport" ("toolId");
CREATE INDEX "ToolTransport_value_idx" ON "ToolTransport" ("value");
CREATE UNIQUE INDEX "ToolFeature_toolId_locale_sortOrder_key" ON "ToolFeature" ("toolId", "locale", "sortOrder");
CREATE INDEX "ToolFeature_toolId_locale_idx" ON "ToolFeature" ("toolId", "locale");
CREATE INDEX "ToolFeature_locale_idx" ON "ToolFeature" ("locale");
CREATE UNIQUE INDEX "ToolScreenshot_toolId_url_key" ON "ToolScreenshot" ("toolId", "url");
CREATE INDEX "ToolScreenshot_toolId_idx" ON "ToolScreenshot" ("toolId");

CREATE UNIQUE INDEX "Category_slug_key" ON "Category" ("slug");
CREATE INDEX "Category_slug_idx" ON "Category" ("slug");
CREATE UNIQUE INDEX "Platform_slug_key" ON "Platform" ("slug");
CREATE INDEX "Platform_slug_idx" ON "Platform" ("slug");

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
CREATE UNIQUE INDEX "User_proToken_key" ON "User" ("proToken");
CREATE INDEX "User_email_idx" ON "User" ("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account" ("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account" ("userId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session" ("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session" ("userId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken" ("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken" ("identifier", "token");

CREATE UNIQUE INDEX "Review_userId_toolId_key" ON "Review" ("userId", "toolId");
CREATE INDEX "Review_toolId_idx" ON "Review" ("toolId");
CREATE INDEX "Review_userId_idx" ON "Review" ("userId");
CREATE INDEX "Submission_status_idx" ON "Submission" ("status");
CREATE UNIQUE INDEX "SubmissionSuggestedTag_submissionId_value_key" ON "SubmissionSuggestedTag" ("submissionId", "value");
CREATE INDEX "SubmissionSuggestedTag_submissionId_idx" ON "SubmissionSuggestedTag" ("submissionId");

CREATE UNIQUE INDEX "ToolTagVote_toolId_tagSlug_userId_key" ON "ToolTagVote" ("toolId", "tagSlug", "userId");
CREATE INDEX "ToolTagVote_toolId_idx" ON "ToolTagVote" ("toolId");
CREATE INDEX "ToolTagVote_toolId_tagSlug_idx" ON "ToolTagVote" ("toolId", "tagSlug");
CREATE UNIQUE INDEX "Favorite_userId_toolId_key" ON "Favorite" ("userId", "toolId");
CREATE INDEX "Favorite_userId_idx" ON "Favorite" ("userId");
CREATE INDEX "Favorite_toolId_idx" ON "Favorite" ("toolId");

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber" ("email");
CREATE UNIQUE INDEX "NewsletterSubscriber_token_key" ON "NewsletterSubscriber" ("token");
CREATE INDEX "NewsletterSubscriber_email_idx" ON "NewsletterSubscriber" ("email");
CREATE INDEX "NewsletterSubscriber_active_idx" ON "NewsletterSubscriber" ("active");
CREATE UNIQUE INDEX "TranslationCache_sourceHash_key" ON "TranslationCache" ("sourceHash");
CREATE INDEX "TranslationCache_sourceHash_idx" ON "TranslationCache" ("sourceHash");
CREATE UNIQUE INDEX "TranslationCacheFeature_translationCacheId_sortOrder_key" ON "TranslationCacheFeature" ("translationCacheId", "sortOrder");
CREATE INDEX "TranslationCacheFeature_translationCacheId_idx" ON "TranslationCacheFeature" ("translationCacheId");

CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection" ("slug");
CREATE INDEX "Collection_isPublished_idx" ON "Collection" ("isPublished");
CREATE INDEX "Collection_sortOrder_idx" ON "Collection" ("sortOrder");
CREATE INDEX "CollectionTool_collectionId_idx" ON "CollectionTool" ("collectionId");
CREATE UNIQUE INDEX "ToolSubscription_userId_toolId_key" ON "ToolSubscription" ("userId", "toolId");
CREATE INDEX "ToolSubscription_userId_idx" ON "ToolSubscription" ("userId");
CREATE INDEX "ToolSubscription_toolId_idx" ON "ToolSubscription" ("toolId");
CREATE INDEX "Notification_userId_read_idx" ON "Notification" ("userId", "read");
CREATE INDEX "Notification_userId_idx" ON "Notification" ("userId");
CREATE INDEX "Notification_toolId_idx" ON "Notification" ("toolId");
CREATE INDEX "DigestSend_userId_idx" ON "DigestSend" ("userId");
CREATE INDEX "DigestSend_sentAt_idx" ON "DigestSend" ("sentAt");
CREATE INDEX "JobRun_workflow_status_idx" ON "JobRun" ("workflow", "status");
CREATE INDEX "JobRun_createdAt_idx" ON "JobRun" ("createdAt");
