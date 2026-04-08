// @jest-environment node
import { parseRepoUrl, fetchRepoData } from '@/lib/github-client';

describe('parseRepoUrl', () => {
  it('parses standard GitHub URL', () => {
    const result = parseRepoUrl('https://github.com/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('parses tree-path GitHub URL correctly', () => {
    const result = parseRepoUrl('https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem');
    expect(result).toEqual({ owner: 'modelcontextprotocol', repo: 'servers' });
  });

  it('returns null for non-GitHub URL', () => {
    const result = parseRepoUrl('https://not-github.com/foo/bar');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseRepoUrl('');
    expect(result).toBeNull();
  });
});

describe('fetchRepoData', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns GitHubRepoData on successful response', async () => {
    const mockData = {
      stargazers_count: 100,
      forks_count: 20,
      open_issues_count: 5,
      pushed_at: '2026-04-01T00:00:00Z',
      description: 'A test repo',
      topics: ['mcp', 'ai'],
      license: { key: 'mit', name: 'MIT License' },
      language: 'TypeScript',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
      headers: new Headers({ 'x-ratelimit-remaining': '4999' }),
    });

    const result = await fetchRepoData('owner', 'repo');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
        }),
      }),
    );
  });

  it('throws on non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
    });

    await expect(fetchRepoData('owner', 'nonexistent')).rejects.toThrow(
      'GitHub API 404: Not Found for owner/nonexistent',
    );
  });

  it('logs warning when rate limit remaining is low', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        pushed_at: '2026-04-01T00:00:00Z',
        description: null,
        topics: [],
        license: null,
        language: null,
      }),
      headers: new Headers({ 'x-ratelimit-remaining': '50' }),
    });

    await fetchRepoData('owner', 'repo');
    expect(warnSpy).toHaveBeenCalledWith('GitHub API rate limit low: 50 remaining');

    warnSpy.mockRestore();
  });

  it('does not log warning when rate limit is healthy', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        pushed_at: '2026-04-01T00:00:00Z',
        description: null,
        topics: [],
        license: null,
        language: null,
      }),
      headers: new Headers({ 'x-ratelimit-remaining': '4000' }),
    });

    await fetchRepoData('owner', 'repo');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
