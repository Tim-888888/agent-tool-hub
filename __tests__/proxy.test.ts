/**
 * @jest-environment node
 */

import { proxy } from '@/proxy';
import type { NextRequest } from 'next/server';

function createClonableUrl(path: string): URL & { clone(): URL & { clone(): ReturnType<typeof createClonableUrl> } } {
  const url = new URL(path, 'http://localhost:3000');
  const clonable = Object.assign(url, {
    clone() {
      return createClonableUrl(url.pathname + url.search);
    },
  });
  return clonable;
}

function createRequest(path: string, acceptLanguage?: string): NextRequest {
  return {
    nextUrl: createClonableUrl(path),
    headers: new Headers(
      acceptLanguage ? { 'accept-language': acceptLanguage } : {}
    ),
    cookies: {
      set: jest.fn(),
    },
  } as unknown as NextRequest;
}

describe('proxy', () => {
  it('skips /api/tools', () => {
    const req = createRequest('/api/tools');
    const result = proxy(req);
    expect(result).toBeUndefined();
  });

  it('skips /_next/static/xxx', () => {
    const req = createRequest('/_next/static/chunk.js');
    const result = proxy(req);
    expect(result).toBeUndefined();
  });

  it('skips /_vercel', () => {
    const req = createRequest('/_vercel/insights');
    const result = proxy(req);
    expect(result).toBeUndefined();
  });

  it('skips static files with extension', () => {
    const req = createRequest('/favicon.ico');
    const result = proxy(req);
    expect(result).toBeUndefined();
  });

  it('rewrites /tools/brave-search to /en/tools/brave-search for English Accept-Language', () => {
    const req = createRequest('/tools/brave-search', 'en-US,en;q=0.9');
    const result = proxy(req);
    expect(result).toBeDefined();
    // @ts-expect-error -- accessing internal property for test
    expect(result?.headers?.get?.('x-middleware-rewrite') ?? '').toMatch(/\/en\/tools\/brave-search/);
  });

  it('redirects /tools/brave-search to /zh/tools/brave-search for Chinese Accept-Language', () => {
    const req = createRequest('/tools/brave-search', 'zh-CN,zh;q=0.9');
    const result = proxy(req);
    expect(result).toBeDefined();
    // @ts-expect-error -- accessing internal property for test
    const location = result?.headers?.get?.('location') ?? '';
    expect(location).toContain('/zh/tools/brave-search');
  });

  it('returns undefined for /zh/tools/brave-search (already has non-default prefix)', () => {
    const req = createRequest('/zh/tools/brave-search');
    const result = proxy(req);
    expect(result).toBeUndefined();
  });

  it('redirects /en/tools/brave-search to /tools/brave-search (strips default prefix)', () => {
    const req = createRequest('/en/tools/brave-search');
    const result = proxy(req);
    expect(result).toBeDefined();
    // @ts-expect-error -- accessing internal property for test
    const location = result?.headers?.get?.('location') ?? '';
    expect(location).toContain('/tools/brave-search');
    expect(location).not.toContain('/en/tools/brave-search');
  });

  it('handles root path / for default locale', () => {
    const req = createRequest('/', 'en-US,en;q=0.9');
    const result = proxy(req);
    expect(result).toBeDefined();
  });

  it('handles root path / for non-default locale', () => {
    const req = createRequest('/', 'zh-CN,zh;q=0.9');
    const result = proxy(req);
    expect(result).toBeDefined();
    // @ts-expect-error -- accessing internal property for test
    const location = result?.headers?.get?.('location') ?? '';
    expect(location).toContain('/zh');
  });
});
