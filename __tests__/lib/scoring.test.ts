// @jest-environment node
import { computeScore, type ScoreInput } from '@/lib/scoring';

describe('computeScore', () => {
  it('returns 0.0 for all zeros/null inputs', () => {
    const result = computeScore({
      stars: 0,
      forks: 0,
      lastCommitAt: null,
      npmDownloads: null,
    });
    expect(result).toBe(0.0);
  });

  it('returns a high score for a high-star, active tool', () => {
    const result = computeScore({
      stars: 83090,
      forks: 12000,
      lastCommitAt: new Date(),
      npmDownloads: 50000,
    });
    expect(result).toBeGreaterThan(50);
  });

  it('gives full activity score for commit within 30 days', () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const result = computeScore({
      stars: 1,
      forks: 1,
      lastCommitAt: twentyDaysAgo,
      npmDownloads: 1,
    });
    // starsScore = min(40, 10*log10(1)) = 0 (log10(1) = 0)
    // activityScore = 20 (within 30 days)
    // downloadScore = min(20, 4*log10(1)) = 0
    // forksScore = min(20, 5*log10(1)) = 0
    // total = 0 + 20 + 0 + 0 = 20
    expect(result).toBe(20.0);
  });

  it('gives zero activity score for commit older than 365 days', () => {
    const fourHundredDaysAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const result = computeScore({
      stars: 1,
      forks: 1,
      lastCommitAt: fourHundredDaysAgo,
      npmDownloads: 1,
    });
    expect(result).toBe(0.0);
  });

  it('decays activity score between 30 and 365 days', () => {
    const daysAgo180 = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const result = computeScore({
      stars: 1,
      forks: 1,
      lastCommitAt: daysAgo180,
      npmDownloads: 1,
    });
    // Only activity contributes (others are 0 from log10(1)=0)
    // daysSince = 180, >30 and <365
    // activityScore = 20 * (1 - (180-30)/(365-30)) ~ 11.04
    expect(result).toBeGreaterThan(8);
    expect(result).toBeLessThan(14);
  });

  it('gives near-maximum stars score for 10000 stars', () => {
    const result = computeScore({
      stars: 10000,
      forks: 1,
      lastCommitAt: null,
      npmDownloads: null,
    });
    // starsScore = min(40, 10 * log10(10000)) = min(40, 40) = 40
    expect(result).toBe(40.0);
  });

  it('gives ~10 points for 10 stars', () => {
    const result = computeScore({
      stars: 10,
      forks: 1,
      lastCommitAt: null,
      npmDownloads: null,
    });
    // starsScore = min(40, 10 * log10(10)) = min(40, 10) = 10
    expect(result).toBe(10.0);
  });

  it('treats null npmDownloads as 0 points', () => {
    const result = computeScore({
      stars: 1,
      forks: 1,
      lastCommitAt: null,
      npmDownloads: null,
    });
    expect(result).toBe(0.0);
  });

  it('gives download score for high npm downloads', () => {
    const result = computeScore({
      stars: 1,
      forks: 1,
      lastCommitAt: null,
      npmDownloads: 10000,
    });
    // downloadScore = min(20, 4 * log10(10000)) = min(20, 16) = 16
    expect(result).toBe(16.0);
  });

  it('never exceeds 100 total points', () => {
    const result = computeScore({
      stars: 1_000_000,
      forks: 1_000_000,
      lastCommitAt: new Date(),
      npmDownloads: 100_000_000,
    });
    expect(result).toBeLessThanOrEqual(100);
  });

  it('rounds score to 1 decimal place', () => {
    const result = computeScore({
      stars: 50,
      forks: 30,
      lastCommitAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      npmDownloads: 500,
    });
    expect(Math.round(result * 10) / 10).toBe(result);
  });

  it('gives forks score for 1000 forks', () => {
    const result = computeScore({
      stars: 1,
      forks: 1000,
      lastCommitAt: null,
      npmDownloads: null,
    });
    // forksScore = min(20, 5 * log10(1000)) = min(20, 15) = 15
    expect(result).toBe(15.0);
  });
});
