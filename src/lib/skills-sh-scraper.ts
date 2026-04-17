/**
 * Skills.sh scraper module.
 *
 * Fetches skill data from Vercel's skills.sh directory via the public /api/search
 * endpoint and creates PENDING tools in the database.
 *
 * Design:
 * - Uses /api/search?q={query}&limit={n} to enumerate skills
 * - Each skill gets its own tool entry (one per skill, not per repo)
 * - Fast import: no GitHub API calls during collection, just stores skill data
 * - GitHub enrichment + GLM translation done in Phase B via /api/skills-sh/enrich
 * - Rate limits: 30 requests/min to skills.sh, batch with 2.5s delays
 */

import { prisma } from '@/lib/db';

const SKILLS_SH_BASE = process.env.SKILLS_SH_BASE || 'https://skills.sh';

/** A skill from the skills.sh /api/search response. */
export interface SkillsShSkill {
  id: string;        // "owner/repo/skill-name"
  skillId: string;   // "skill-name"
  name: string;      // display name
  installs: number;  // total install count
  source: string;    // "owner/repo"
}

/** Result of a skills.sh discovery run. */
export interface SkillsShDiscoveryResult {
  source: string;
  discovered: number;
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Broad 2-char substrings to maximize skill coverage.
 * skills.sh uses fuzzy search, so short common substrings match the most skills.
 * Rate limit: 30 req/min, so we batch with delays.
 */
const SEARCH_QUERIES = [
  // High-yield 2-char substrings (each matches 30K-53K skills)
  'll', 'er', 'in', 'on', 'an', 're', 'al', 'en', 'ar', 'te',
  'nt', 'ng', 'ch', 'io', 'pe', 'ma', 'se', 'le', 'ri', 'or',
  // Topic-specific queries for quality boost
  'mcp', 'server', 'cli', 'agent', 'automation', 'workflow',
  'react', 'typescript', 'python', 'frontend', 'backend',
  'testing', 'security', 'docker', 'database', 'deploy',
];

const MAX_RESULTS_PER_QUERY = 500;

/**
 * Search skills.sh for skills matching a query.
 * Returns parsed skill objects or empty array on failure.
 */
export async function searchSkillsSh(
  query: string,
  limit: number = MAX_RESULTS_PER_QUERY,
): Promise<SkillsShSkill[]> {
  try {
    const url = `${SKILLS_SH_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`skills.sh search "${query}": ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return (data.skills || []) as SkillsShSkill[];
  } catch (error) {
    console.warn(
      `skills.sh search "${query}" failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Fetch skills from skills.sh using multiple broad search queries.
 * Deduplicates by skill id and sorts by installs (descending).
 * Runs searches in batches with delays to respect rate limits (30 req/min).
 */
export async function fetchAllSkillsSh(): Promise<SkillsShSkill[]> {
  const allSkills: SkillsShSkill[] = [];
  const seenIds = new Set<string>();

  // 5 queries per batch, 2.5s delay between batches → ~7 batches = ~17s total delays
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 2500;

  for (let i = 0; i < SEARCH_QUERIES.length; i += BATCH_SIZE) {
    const batch = SEARCH_QUERIES.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((q) => searchSkillsSh(q, MAX_RESULTS_PER_QUERY)),
    );

    for (const skills of results) {
      for (const skill of skills) {
        if (!seenIds.has(skill.id)) {
          seenIds.add(skill.id);
          allSkills.push(skill);
        }
      }
    }

    // Delay between batches to avoid 429 rate limit
    if (i + BATCH_SIZE < SEARCH_QUERIES.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Sort by installs descending
  allSkills.sort((a, b) => b.installs - a.installs);

  return allSkills;
}

/**
 * Fast import pipeline: fetch from skills.sh → deduplicate against DB →
 * create PENDING tools with skill data only (no GitHub, no GLM).
 * Each skill gets its own tool entry.
 * GitHub enrichment + translation done in Phase B via /api/skills-sh/enrich.
 */
export async function runSkillsShDiscovery(): Promise<SkillsShDiscoveryResult> {
  const errors: string[] = [];

  // Get existing skill IDs to skip exact duplicates
  const existingSlugs = new Set(
    (await prisma.tool.findMany({
      where: { type: 'SKILL' },
      select: { slug: true },
    })).map((t) => t.slug),
  );

  // Fetch all skills from skills.sh
  const allSkills = await fetchAllSkillsSh();

  // Filter out skills we already have
  const newSkills = allSkills.filter((skill) => {
    const slug = generateSkillSlug(skill);
    return !existingSlugs.has(slug);
  });

  // Prepare batch data
  const BATCH_CHUNK = 500;
  let created = 0;
  let skipped = allSkills.length - newSkills.length;

  for (let i = 0; i < newSkills.length; i += BATCH_CHUNK) {
    const chunk = newSkills.slice(i, i + BATCH_CHUNK);
    const tools = chunk.map((skill) => {
      const slug = generateSkillSlug(skill);
      const score = Math.min(100, Math.round(Math.log10(Math.max(1, skill.installs)) * 15));
      return {
        slug,
        name: skill.name || skill.skillId,
        description: `${skill.name} — a Claude Code skill from ${skill.source}`,
        repoUrl: `https://github.com/${skill.source}`,
        type: 'SKILL' as const,
        status: 'PENDING' as const,
        stars: skill.installs,
        forks: 0,
        score,
      };
    });

    try {
      const result = await prisma.tool.createMany({
        data: tools,
        skipDuplicates: true,
      });
      created += result.count;
    } catch (error) {
      errors.push(
        `Batch ${Math.floor(i / BATCH_CHUNK)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Update sync state
  await prisma.skillSyncState.upsert({
    where: { id: 'default' },
    update: {
      lastSyncAt: new Date(),
      totalRepos: allSkills.length,
      syncedRepos: existingSlugs.size + created,
    },
    create: {
      id: 'default',
      totalRepos: allSkills.length,
      syncedRepos: existingSlugs.size + created,
    },
  });

  return {
    source: 'skills-sh',
    discovered: allSkills.length,
    created,
    skipped,
    errors,
  };
}

/**
 * Generate a URL-safe slug from skill data.
 * Uses the full skill ID path to ensure uniqueness.
 */
function generateSkillSlug(skill: SkillsShSkill): string {
  // Use skill.id (owner/repo/skill-name) for uniqueness
  const slug = skill.id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `skill-${slug}`;
}
