import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const [key, inlineValue] = arg.slice(2).split("=", 2);
  const nextValue = process.argv[index + 1];
  if (inlineValue !== undefined) {
    args.set(key, inlineValue);
  } else if (nextValue && !nextValue.startsWith("--")) {
    args.set(key, nextValue);
    index += 1;
  } else {
    args.set(key, true);
  }
}

const connectionString =
  args.get("source") ||
  process.env.POSTGRES_DATABASE_URL ||
  process.env.SOURCE_DATABASE_URL ||
  process.env.VERCEL_POSTGRES_URL;
const outputPath = resolve(String(args.get("out") || "exports/postgres-to-d1.sql"));
const countsPath = resolve(String(args.get("counts") || "exports/postgres-to-d1-counts.json"));
const includeDeletes = args.has("with-delete");

if (!connectionString) {
  console.error(
    "Missing source Postgres connection string. Set POSTGRES_DATABASE_URL, SOURCE_DATABASE_URL, VERCEL_POSTGRES_URL, or pass --source.",
  );
  process.exit(1);
}

const baseTables = [
  ["Category", ["id", "slug", "nameEn", "nameZh", "icon", "descriptionEn", "descriptionZh", "order"]],
  ["Platform", ["id", "slug", "name", "icon", "configKey"]],
  ["User", ["id", "name", "email", "emailVerified", "image", "isPro", "proNewsletter", "proToken", "createdAt"]],
  [
    "Tool",
    [
      "id",
      "slug",
      "name",
      "description",
      "descriptionZh",
      "type",
      "status",
      "repoUrl",
      "homepageUrl",
      "npmPackage",
      "pypiPackage",
      "stars",
      "forks",
      "openIssues",
      "language",
      "license",
      "lastCommitAt",
      "author",
      "version",
      "isFeatured",
      "installGuide",
      "avgRating",
      "ratingCount",
      "score",
      "syncedAt",
      "npmDownloads",
      "createdAt",
      "updatedAt",
    ],
  ],
  ["ToolCategory", ["toolId", "categoryId"]],
  ["ToolPlatform", ["toolId", "platformId"]],
  [
    "Account",
    [
      "id",
      "userId",
      "type",
      "provider",
      "providerAccountId",
      "refresh_token",
      "access_token",
      "expires_at",
      "token_type",
      "scope",
      "id_token",
      "session_state",
    ],
  ],
  ["Session", ["id", "sessionToken", "userId", "expires"]],
  ["VerificationToken", ["identifier", "token", "expires"]],
  ["Review", ["id", "toolId", "userId", "rating", "content", "platform", "useCase", "createdAt"]],
  [
    "Submission",
    [
      "id",
      "toolId",
      "userId",
      "repoUrl",
      "submitterName",
      "submitterEmail",
      "notes",
      "status",
      "createdAt",
      "reviewedAt",
    ],
  ],
  ["ToolTagVote", ["id", "toolId", "tagSlug", "userId", "createdAt"]],
  ["Favorite", ["id", "userId", "toolId", "createdAt"]],
  [
    "NewsletterSubscriber",
    ["id", "email", "locale", "active", "token", "createdAt", "unsubscribedAt"],
  ],
  ["TranslationCache", ["id", "sourceHash", "sourceText", "descriptionZh", "createdAt", "updatedAt"]],
  [
    "Collection",
    [
      "id",
      "slug",
      "titleEn",
      "titleZh",
      "descriptionEn",
      "descriptionZh",
      "icon",
      "coverImage",
      "isPublished",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
  ],
  ["CollectionTool", ["collectionId", "toolId", "sortOrder", "noteEn", "noteZh", "addedAt"]],
  ["ToolSubscription", ["id", "userId", "toolId", "createdAt"]],
  ["Notification", ["id", "userId", "toolId", "type", "title", "message", "read", "createdAt"]],
  ["DigestSend", ["id", "userId", "sentAt", "toolCount", "status", "error"]],
  ["SkillSyncState", ["id", "lastSyncAt", "totalRepos", "syncedRepos"]],
  ["JobRun", ["id", "workflow", "status", "cursor", "payload", "error", "startedAt", "finishedAt", "createdAt", "updatedAt"]],
];

const relationTables = [
  "ToolTag",
  "ToolTransport",
  "ToolFeature",
  "ToolScreenshot",
  "SubmissionSuggestedTag",
  "TranslationCacheFeature",
];

const deleteOrder = [
  "JobRun",
  "DigestSend",
  "Notification",
  "ToolSubscription",
  "CollectionTool",
  "Collection",
  "TranslationCacheFeature",
  "TranslationCache",
  "NewsletterSubscriber",
  "Favorite",
  "ToolTagVote",
  "SubmissionSuggestedTag",
  "Submission",
  "Review",
  "VerificationToken",
  "Session",
  "Account",
  "ToolPlatform",
  "ToolCategory",
  "ToolScreenshot",
  "ToolFeature",
  "ToolTransport",
  "ToolTag",
  "Tool",
  "User",
  "Platform",
  "Category",
];

function qid(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return `'${value.toISOString().replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insertStatement(table, columns, row) {
  const columnSql = columns.map(qid).join(", ");
  const valueSql = columns.map((column) => sqlValue(row[column])).join(", ");
  return `INSERT INTO ${qid(table)} (${columnSql}) VALUES (${valueSql});`;
}

function relationId(...parts) {
  const hash = createHash("sha1").update(parts.join("\0")).digest("hex").slice(0, 24);
  return `mig_${hash}`;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((item, index, self) => self.indexOf(item) === index);
}

function relationRows(table, parentKey, values, valueKey = "value", extra = {}) {
  return normalizeList(values).map((value, sortOrder) => ({
    id: relationId(table, parentKey, valueKey, value, String(sortOrder)),
    ...extra,
    [valueKey]: value,
    sortOrder,
  }));
}

async function tableExists(client, table) {
  const result = await client.query(
    `SELECT to_regclass($1) AS "regclass"`,
    [`public.${table}`],
  );
  return result.rows[0]?.regclass !== null;
}

async function readRows(client, table) {
  if (!(await tableExists(client, table))) return [];
  const result = await client.query(`SELECT * FROM ${qid(table)} ORDER BY 1`);
  return result.rows;
}

function pushRelationStatements(lines, counts, table, columns, rows) {
  counts[table] = rows.length;
  for (const row of rows) {
    lines.push(insertStatement(table, columns, row));
  }
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

await client.connect();

try {
  const lines = [
    "-- Generated by scripts/export-postgres-to-d1.mjs",
    "-- Import into an already-migrated Cloudflare D1 database.",
    "PRAGMA defer_foreign_keys = ON;",
  ];
  const counts = {};

  if (includeDeletes) {
    lines.push("-- Optional reset requested with --with-delete.");
    for (const table of deleteOrder) {
      lines.push(`DELETE FROM ${qid(table)};`);
    }
  }

  const toolRows = await readRows(client, "Tool");
  const submissionRows = await readRows(client, "Submission");
  const translationCacheRows = await readRows(client, "TranslationCache");

  const rowsByTable = new Map([
    ["Tool", toolRows],
    ["Submission", submissionRows],
    ["TranslationCache", translationCacheRows],
  ]);

  for (const [table, columns] of baseTables) {
    const rows = rowsByTable.get(table) ?? await readRows(client, table);
    counts[table] = rows.length;
    for (const row of rows) {
      lines.push(insertStatement(table, columns, row));
    }

    if (table === "Tool") {
      pushRelationStatements(
        lines,
        counts,
        "ToolTag",
        ["id", "toolId", "value", "sortOrder"],
        rows.flatMap((row) => relationRows("ToolTag", row.id, row.tags, "value", { toolId: row.id })),
      );
      pushRelationStatements(
        lines,
        counts,
        "ToolTransport",
        ["id", "toolId", "value", "sortOrder"],
        rows.flatMap((row) => relationRows("ToolTransport", row.id, row.transports, "value", { toolId: row.id })),
      );
      pushRelationStatements(
        lines,
        counts,
        "ToolFeature",
        ["id", "toolId", "locale", "value", "sortOrder"],
        rows.flatMap((row) => [
          ...relationRows("ToolFeature", row.id, row.featuresEn, "value", { toolId: row.id, locale: "en" }),
          ...relationRows("ToolFeature", row.id, row.featuresZh, "value", { toolId: row.id, locale: "zh" }),
        ]),
      );
      pushRelationStatements(
        lines,
        counts,
        "ToolScreenshot",
        ["id", "toolId", "url", "sortOrder"],
        rows.flatMap((row) => relationRows("ToolScreenshot", row.id, row.screenshots, "url", { toolId: row.id })),
      );
    }

    if (table === "Submission") {
      pushRelationStatements(
        lines,
        counts,
        "SubmissionSuggestedTag",
        ["id", "submissionId", "value", "sortOrder"],
        rows.flatMap((row) =>
          relationRows("SubmissionSuggestedTag", row.id, row.suggestedTags, "value", { submissionId: row.id }),
        ),
      );
    }

    if (table === "TranslationCache") {
      pushRelationStatements(
        lines,
        counts,
        "TranslationCacheFeature",
        ["id", "translationCacheId", "value", "sortOrder"],
        rows.flatMap((row) =>
          relationRows("TranslationCacheFeature", row.id, row.featuresZh, "value", {
            translationCacheId: row.id,
          }),
        ),
      );
    }
  }

  for (const table of relationTables) {
    counts[table] ??= 0;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(countsPath), { recursive: true });
  writeFileSync(outputPath, `${lines.join("\n")}\n`);
  writeFileSync(countsPath, `${JSON.stringify(counts, null, 2)}\n`);

  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${countsPath}`);
} finally {
  await client.end();
}
