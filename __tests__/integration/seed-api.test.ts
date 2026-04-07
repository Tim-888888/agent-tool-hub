/**
 * @jest-environment node
 *
 * Integration test: verifies seed -> API -> data flow.
 * Requires a running database with seeded data.
 * Automatically skipped when DATABASE_URL is not set.
 */
import { NextRequest } from 'next/server';
import { GET as getTools } from '@/app/api/tools/route';
import { GET as getCategories } from '@/app/api/categories/route';
import { prisma } from '@/lib/db';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Integration: Seed -> API -> Verify', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('API returns seeded tools', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    const response = await getTools(request);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.total).toBe(12);
  });

  it('API returns seeded categories', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/categories'));
    const response = await getCategories(request);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(12);
  });

  it('Tools have categories and platforms attached', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/tools'));
    const response = await getTools(request);
    const body = await response.json();
    const tool = body.data[0];
    expect(tool.categories).toBeDefined();
    expect(tool.categories.length).toBeGreaterThan(0);
    expect(tool.platforms).toBeDefined();
    expect(tool.platforms.length).toBeGreaterThan(0);
  });
});
