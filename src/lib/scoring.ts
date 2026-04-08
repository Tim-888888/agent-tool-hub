/**
 * Weighted scoring algorithm for tool ranking.
 * Per D-05: stars (0-40) + activity (0-20) + npm downloads (0-20) + forks/community (0-20)
 * Per D-07: activity measured by lastCommitAt recency (30 days = full marks, 1 year = zero)
 *
 * NOTE: This is a placeholder created by Plan 02-03 for compilation.
 * Plan 02-02 will provide the full implementation.
 */

export interface ScoreInput {
  stars: number;
  forks: number;
  lastCommitAt: Date | null;
  npmDownloads: number | null;
}

export function computeScore(input: ScoreInput): number {
  // Stars: 0-40 points, logarithmic scale
  const starsScore = Math.min(40, 10 * Math.log10(Math.max(input.stars, 1)));

  // Activity: 0-20 points based on lastCommitAt recency
  let activityScore = 0;
  if (input.lastCommitAt) {
    const daysSinceCommit =
      (Date.now() - input.lastCommitAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCommit <= 30) {
      activityScore = 20;
    } else if (daysSinceCommit <= 365) {
      activityScore = 20 * (1 - (daysSinceCommit - 30) / (365 - 30));
    }
  }

  // npm downloads: 0-20 points, logarithmic
  const downloads = input.npmDownloads ?? 0;
  const downloadScore =
    downloads > 0 ? Math.min(20, 4 * Math.log10(Math.max(downloads, 1))) : 0;

  // Forks/community: 0-20 points, logarithmic
  const forksScore = Math.min(20, 5 * Math.log10(Math.max(input.forks, 1)));

  const total = starsScore + activityScore + downloadScore + forksScore;
  return Math.round(Math.min(total, 100) * 10) / 10;
}
