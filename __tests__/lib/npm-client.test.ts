// @jest-environment node
import { fetchWeeklyDownloads } from '@/lib/npm-client';

describe('fetchWeeklyDownloads', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns download count on successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        downloads: 12345,
        package: 'express',
        start: '2026-03-31',
        end: '2026-04-06',
      }),
    });

    const result = await fetchWeeklyDownloads('express');
    expect(result).toBe(12345);
  });

  it('returns 0 on 404 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await fetchWeeklyDownloads('nonexistent-package');
    expect(result).toBe(0);
  });

  it('throws on 500 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchWeeklyDownloads('express')).rejects.toThrow(
      'npm API 500: Internal Server Error for express',
    );
  });

  it('URL-encodes scoped package names', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        downloads: 500,
        package: '@modelcontextprotocol/server-filesystem',
        start: '2026-03-31',
        end: '2026-04-06',
      }),
    });

    const result = await fetchWeeklyDownloads('@modelcontextprotocol/server-filesystem');
    expect(result).toBe(500);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.npmjs.org/downloads/point/last-week/%40modelcontextprotocol%2Fserver-filesystem',
    );
  });
});
