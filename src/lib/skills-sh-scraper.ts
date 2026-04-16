/**
 * Skills.sh scraper module.
 *
 * Fetches skill data from Vercel's skills.sh directory via the public /api/search
 * endpoint, enriches with GitHub repo data, and creates PENDING tools in the database.
 *
 * Design:
 * - Uses /api/search?q={query}&limit={n} to enumerate skills
 * - Searches with broad programming terms to maximize coverage
 * - Deduplicates by skill id (source repo + skill name)
 * - Skips repos already in the database or with pending submissions
 * - Enriches with GitHub stars, forks, language, license via fetchRepoData
 * - Creates tools with type=SKILL and status=PENDING for admin review
 */

import { prisma } from '@/lib/db';
import { fetchRepoData } from '@/lib/github-client';
import { translateToolToChinese } from '@/lib/translate';
import { computeScore } from '@/lib/scoring';
import { withRetry } from '@/lib/retry';

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

/** Broad search queries to maximize skill coverage. */
const SEARCH_QUERIES = [
  'react',
  'typescript',
  'python',
  'mcp server',
  'frontend',
  'backend',
  'testing',
  'code review',
  'security',
  'docker',
  'api',
  'database',
  'deploy',
  'git',
  'performance',
  'css',
  'tailwind',
  'nextjs',
  'node',
  'rust',
];

const MAX_RESULTS_PER_QUERY = 20;
const MAX_TOOLS_PER_RUN = 30;

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
 */
export async function fetchAllSkillsSh(): Promise<SkillsShSkill[]> {
  const allSkills: SkillsShSkill[] = [];
  const seenIds = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    const skills = await searchSkillsSh(query, MAX_RESULTS_PER_QUERY);

    for (const skill of skills) {
      if (!seenIds.has(skill.id)) {
        seenIds.add(skill.id);
        allSkills.push(skill);
      }
    }
  }

  // Sort by installs descending
  allSkills.sort((a, b) => b.installs - a.installs);

  return allSkills;
}

/**
 * Full discovery pipeline: fetch from skills.sh → deduplicate against DB →
 * enrich with GitHub data → create PENDING tools.
 */
export async function runSkillsShDiscovery(): Promise<SkillsShDiscoveryResult> {
  const errors: string[] = [];

  // Get existing tool repo URLs to skip duplicates
  const existingUrls = new Set(
    (await prisma.tool.findMany({ select: { repoUrl: true } }))
      .map((t) => t.repoUrl),
  );

  // Also skip repos with pending submissions
  const pendingUrls = new Set(
    (await prisma.submission.findMany({
      where: { status: 'PENDING' },
      select: { repoUrl: true },
    }))
      .map((s) => s.repoUrl),
  );

  const knownUrls = new Set([...existingUrls, ...pendingUrls]);

  // Fetch all skills from skills.sh
  const allSkills = await fetchAllSkillsSh();

  // Filter out skills whose source repo is already known
  const newSkills = allSkills.filter((skill) => {
    const repoUrl = `https://github.com/${skill.source}`;
    return !knownUrls.has(repoUrl);
  });

  let created = 0;
  const seenRepos = new Set<string>();

  for (const skill of newSkills.slice(0, MAX_TOOLS_PER_RUN)) {
    try {
      const repoUrl = `https://github.com/${skill.source}`;
      const [owner, repo] = skill.source.split('/');

      // Skip if we already processed this repo (one tool per repo)
      if (seenRepos.has(skill.source)) continue;
      seenRepos.add(skill.source);

      // Enrich with GitHub data
      let stars = 0;
      let forks = 0;
      let language: string | null = null;
      let license: string | null = null;
      let description = '';
      let pushedAt: Date | null = null;

      try {
        const repoData = await withRetry(() => fetchRepoData(owner, repo));
        stars = repoData.stargazers_count;
        forks = repoData.forks_count;
        language = repoData.language;
        license = repoData.license?.key ?? null;
        description = repoData.description || skill.name;
        pushedAt = new Date(repoData.pushed_at);
      } catch {
        errors.push(`GitHub fetch failed for ${skill.source}, skipping`);
        continue;
      }

      // Generate slug from source repo
      const slug = generateSlug(owner, repo);

      // Skip if slug already exists
      const existingSlug = await prisma.tool.findUnique({ where: { slug } });
      if (existingSlug) continue;

      const score = computeScore({
        stars,
        forks,
        lastCommitAt: pushedAt,
        npmDownloads: null,
      });

      await prisma.tool.create({
        data: {
          slug,
          name: repo || skill.name,
          description,
          repoUrl,
          type: 'SKILL',
          status: 'PENDING',
          stars,
          forks,
          language,
          license,
          score,
        },
      });

      // Translate to Chinese (fire-and-forget)
      if (description) {
        translateToolToChinese(description, [])
          .then(async (translation) => {
            if (translation.descriptionZh) {
              await prisma.tool.update({
                where: { slug },
                data: { descriptionZh: translation.descriptionZh },
              });
            }
          })
          .catch(() => {});
      }

      created++;
    } catch (error) {
      errors.push(
        `Create ${skill.source}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    source: 'skills-sh',
    discovered: allSkills.length,
    created,
    skipped: newSkills.length - created,
    errors,
  };
}

/**
 * Generate a URL-safe slug from owner and repo name.
 * Prefixes with "skill-" to distinguish from other tool types.
 */
function generateSlug(owner: string, repo: string): string {
  let slug = repo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Prefix with owner if slug is too generic
  const genericNames = ['server', 'mcp-server', 'mcp', 'client', 'sdk', 'skills', 'agent-skills'];
  if (genericNames.includes(slug)) {
    slug = `${owner.toLowerCase()}-${slug}`;
  }

  return slug;
}
