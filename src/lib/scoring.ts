/**
 * Weighted scoring algorithm for tool ranking.
 * Per D-05: stars (0-40) + activity (0-20) + npm downloads (0-20) + forks/community (0-20)
 * Per D-07: activity measured by lastCommitAt recency (30 days = full marks, 1 year = zero)
 */

export interface ScoreInput {
  stars: number;
  forks: number;
  lastCommitAt: Date | null;
  npmDownloads: number | null;
}

export function computeScore(input: ScoreInput): number {
  // Stars: 0-40 points, logarithmic scale
  // 10 stars ~ 10pts, 100 ~ 20pts, 1000 ~ 30pts, 10000+ ~ 40pts
  const starsScore = Math.min(40, 10 * Math.log10(Math.max(input.stars, 1)));

  // Activity: 0-20 points based on lastCommitAt recency
  // Per D-07: full marks within 30 days, zero after 365 days
  let activityScore = 0;
  if (input.lastCommitAt) {
    const daysSinceCommit =
      (Date.now() - input.lastCommitAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCommit <= 30) {
      activityScore = 20;
    } else if (daysSinceCommit <= 365) {
      // Linear decay from 20 to 0 between day 30 and day 365
      activityScore = 20 * (1 - (daysSinceCommit - 30) / (365 - 30));
    }
    // > 365 days = 0 points
  }
  // null lastCommitAt = 0 points

  // npm downloads: 0-20 points, logarithmic
  const downloads = input.npmDownloads ?? 0;
  const downloadScore =
    downloads > 0 ? Math.min(20, 4 * Math.log10(Math.max(downloads, 1))) : 0;

  // Forks/community: 0-20 points, logarithmic
  const forksScore = Math.min(20, 5 * Math.log10(Math.max(input.forks, 1)));

  const total = starsScore + activityScore + downloadScore + forksScore;
  return Math.round(Math.min(total, 100) * 10) / 10;
}
