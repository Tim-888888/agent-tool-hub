import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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

const sourceOrigin = String(
  args.get("source") || process.env.VERCEL_PUBLIC_SOURCE_URL || "https://agent-tool-hub.vercel.app",
).replace(/\/$/, "");
const outputPath = resolve(String(args.get("out") || "exports/vercel-public-to-d1.sql"));
const countsPath = resolve(String(args.get("counts") || "exports/vercel-public-to-d1-counts.json"));
const pageSize = Number(args.get("limit") || 100);
const chunkSize = Number(args.get("chunk-size") || 0);

function qid(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

function relationId(...parts) {
  const hash = createHash("sha1").update(parts.join("\0")).digest("hex").slice(0, 24);
  return `pub_${hash}`;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((item, index, self) => self.indexOf(item) === index);
}

function insertOrUpdateBySlug(table, columns, updateColumns, row) {
  const columnSql = columns.map(qid).join(", ");
  const valueSql = columns.map((column) => sqlValue(row[column])).join(", ");
  const updateSql = updateColumns
    .map((column) => `${qid(column)} = excluded.${qid(column)}`)
    .join(", ");
  return `INSERT INTO ${qid(table)} (${columnSql}) VALUES (${valueSql}) ON CONFLICT(${qid("slug")}) DO UPDATE SET ${updateSql};`;
}

function insertRelation(table, columns, values) {
  return `INSERT OR IGNORE INTO ${qid(table)} (${columns.map(qid).join(", ")}) VALUES (${values.join(", ")});`;
}

function toolIdBySlug(slug) {
  return `(SELECT ${qid("id")} FROM ${qid("Tool")} WHERE ${qid("slug")} = ${sqlValue(slug)})`;
}

function categoryIdBySlug(slug) {
  return `(SELECT ${qid("id")} FROM ${qid("Category")} WHERE ${qid("slug")} = ${sqlValue(slug)})`;
}

function platformIdBySlug(slug) {
  return `(SELECT ${qid("id")} FROM ${qid("Platform")} WHERE ${qid("slug")} = ${sqlValue(slug)})`;
}

async function fetchJson(path, searchParams = {}, attempt = 1) {
  const url = new URL(path, sourceOrigin);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return fetchJson(path, searchParams, attempt + 1);
    }
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }

  if (!response.ok) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return fetchJson(path, searchParams, attempt + 1);
    }
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function collectPlatform(platforms, platform) {
  if (!platform?.slug) return;
  platforms.set(platform.slug, {
    id: platform.id,
    slug: platform.slug,
    name: platform.name,
    icon: platform.icon || "Box",
    configKey: platform.configKey || platform.slug,
  });
}

function toolRow(tool) {
  return {
    id: tool.id,
    slug: tool.slug,
    name: tool.name,
    description: tool.description || "",
    descriptionZh: tool.descriptionZh ?? null,
    type: tool.type,
    status: tool.status || (tool.isFeatured ? "FEATURED" : "ACTIVE"),
    repoUrl: tool.repoUrl,
    homepageUrl: tool.homepageUrl ?? null,
    npmPackage: tool.npmPackage ?? null,
    pypiPackage: tool.pypiPackage ?? null,
    stars: tool.stars ?? 0,
    forks: tool.forks ?? 0,
    openIssues: tool.openIssues ?? 0,
    language: tool.language ?? null,
    license: tool.license ?? null,
    lastCommitAt: tool.lastCommitAt ?? null,
    author: tool.author ?? null,
    version: tool.version ?? null,
    isFeatured: Boolean(tool.isFeatured || tool.status === "FEATURED"),
    installGuide: tool.installGuide ?? null,
    avgRating: tool.avgRating ?? 0,
    ratingCount: tool.ratingCount ?? 0,
    score: null,
    syncedAt: null,
    npmDownloads: null,
    createdAt: tool.createdAt ?? new Date().toISOString(),
    updatedAt: tool.updatedAt ?? new Date().toISOString(),
  };
}

const categoryPayload = await fetchJson("/api/categories");
if (!categoryPayload.success || !Array.isArray(categoryPayload.data)) {
  throw new Error("Unexpected /api/categories response");
}

const firstToolsPayload = await fetchJson("/api/tools", { page: 1, limit: pageSize });
if (!firstToolsPayload.success || !Array.isArray(firstToolsPayload.data)) {
  throw new Error("Unexpected /api/tools response");
}

const totalPages = firstToolsPayload.meta?.totalPages ?? 1;
const tools = [...firstToolsPayload.data];

for (let page = 2; page <= totalPages; page += 1) {
  const payload = await fetchJson("/api/tools", { page, limit: pageSize });
  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error(`Unexpected /api/tools response for page ${page}`);
  }
  tools.push(...payload.data);
  if (page % 10 === 0 || page === totalPages) {
    console.log(`Fetched ${tools.length} tools (${page}/${totalPages})`);
  }
}

const platforms = new Map();
for (const tool of tools) {
  for (const platform of tool.platforms ?? []) {
    collectPlatform(platforms, platform);
  }
}

const lines = [
  "-- Generated by scripts/export-vercel-public-api-to-d1.mjs",
  `-- Source: ${sourceOrigin}`,
  "-- This public API export does not contain private auth/session/favorite/user data.",
  "PRAGMA defer_foreign_keys = ON;",
];

const categoryColumns = ["id", "slug", "nameEn", "nameZh", "icon", "descriptionEn", "descriptionZh", "order"];
for (const category of categoryPayload.data) {
  lines.push(
    insertOrUpdateBySlug("Category", categoryColumns, categoryColumns.filter((column) => column !== "id" && column !== "slug"), {
      id: category.id,
      slug: category.slug,
      nameEn: category.nameEn,
      nameZh: category.nameZh,
      icon: category.icon,
      descriptionEn: category.descriptionEn ?? null,
      descriptionZh: category.descriptionZh ?? null,
      order: category.order ?? 0,
    }),
  );
}

const platformColumns = ["id", "slug", "name", "icon", "configKey"];
for (const platform of platforms.values()) {
  lines.push(
    insertOrUpdateBySlug("Platform", platformColumns, platformColumns.filter((column) => column !== "id" && column !== "slug"), platform),
  );
}

const toolColumns = [
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
];
const toolUpdateColumns = toolColumns.filter(
  (column) => !["id", "slug", "score", "syncedAt", "npmDownloads", "createdAt"].includes(column),
);

for (const tool of tools) {
  const row = toolRow(tool);
  lines.push(insertOrUpdateBySlug("Tool", toolColumns, toolUpdateColumns, row));
  const toolId = toolIdBySlug(tool.slug);

  for (const table of ["ToolTag", "ToolTransport", "ToolFeature", "ToolScreenshot", "ToolCategory", "ToolPlatform"]) {
    lines.push(`DELETE FROM ${qid(table)} WHERE ${qid("toolId")} = ${toolId};`);
  }

  for (const [sortOrder, value] of normalizeList(tool.tags).entries()) {
    lines.push(
      insertRelation("ToolTag", ["id", "toolId", "value", "sortOrder"], [
        sqlValue(relationId("ToolTag", tool.slug, value, sortOrder)),
        toolId,
        sqlValue(value),
        sqlValue(sortOrder),
      ]),
    );
  }

  for (const [sortOrder, value] of normalizeList(tool.transports).entries()) {
    lines.push(
      insertRelation("ToolTransport", ["id", "toolId", "value", "sortOrder"], [
        sqlValue(relationId("ToolTransport", tool.slug, value, sortOrder)),
        toolId,
        sqlValue(value),
        sqlValue(sortOrder),
      ]),
    );
  }

  for (const [locale, values] of [
    ["en", tool.featuresEn],
    ["zh", tool.featuresZh],
  ]) {
    for (const [sortOrder, value] of normalizeList(values).entries()) {
      lines.push(
        insertRelation("ToolFeature", ["id", "toolId", "locale", "value", "sortOrder"], [
          sqlValue(relationId("ToolFeature", tool.slug, locale, value, sortOrder)),
          toolId,
          sqlValue(locale),
          sqlValue(value),
          sqlValue(sortOrder),
        ]),
      );
    }
  }

  for (const [sortOrder, url] of normalizeList(tool.screenshots).entries()) {
    lines.push(
      insertRelation("ToolScreenshot", ["id", "toolId", "url", "sortOrder"], [
        sqlValue(relationId("ToolScreenshot", tool.slug, url, sortOrder)),
        toolId,
        sqlValue(url),
        sqlValue(sortOrder),
      ]),
    );
  }

  for (const category of tool.categories ?? []) {
    if (!category?.slug) continue;
    lines.push(insertRelation("ToolCategory", ["toolId", "categoryId"], [toolId, categoryIdBySlug(category.slug)]));
  }

  for (const platform of tool.platforms ?? []) {
    if (!platform?.slug) continue;
    lines.push(insertRelation("ToolPlatform", ["toolId", "platformId"], [toolId, platformIdBySlug(platform.slug)]));
  }
}

const counts = {
  Category: categoryPayload.data.length,
  Platform: platforms.size,
  Tool: tools.length,
  ToolTag: tools.reduce((count, tool) => count + normalizeList(tool.tags).length, 0),
  ToolTransport: tools.reduce((count, tool) => count + normalizeList(tool.transports).length, 0),
  ToolFeature: tools.reduce(
    (count, tool) => count + normalizeList(tool.featuresEn).length + normalizeList(tool.featuresZh).length,
    0,
  ),
  ToolScreenshot: tools.reduce((count, tool) => count + normalizeList(tool.screenshots).length, 0),
  ToolCategory: tools.reduce((count, tool) => count + (tool.categories?.length ?? 0), 0),
  ToolPlatform: tools.reduce((count, tool) => count + (tool.platforms?.length ?? 0), 0),
};

mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(dirname(countsPath), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);
writeFileSync(countsPath, `${JSON.stringify(counts, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${countsPath}`);

if (chunkSize > 0) {
  const basePath = outputPath.replace(/\.sql$/i, "");
  const chunkCount = Math.ceil(lines.length / chunkSize);
  for (let index = 0; index < chunkCount; index += 1) {
    const chunkPath = `${basePath}.${String(index + 1).padStart(3, "0")}.sql`;
    const chunkLines = [
      `-- Chunk ${index + 1}/${chunkCount} generated by scripts/export-vercel-public-api-to-d1.mjs`,
      ...lines.slice(index * chunkSize, (index + 1) * chunkSize),
    ];
    writeFileSync(chunkPath, `${chunkLines.join("\n")}\n`);
  }
  console.log(`Wrote ${chunkCount} chunk file(s) with up to ${chunkSize} statements each`);
}
