import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TOOL_PRISMA_INCLUDE, mapToolResponse } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';
import CategoryDetailClient from './CategoryDetailClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await withRetry(() =>
      prisma.category.findUnique({ where: { slug } }),
    );
    if (!category) return { title: 'Category Not Found' };

    return {
      title: `${category.nameEn} Tools — AgentToolHub`,
      description: category.descriptionEn ?? `Discover the best ${category.nameEn} tools for AI agents.`,
    };
  } catch {
    return { title: 'Category Not Found' };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const category = await withRetry(() =>
    prisma.category.findUnique({
      where: { slug },
      include: {
        tools: {
          where: { tool: { status: { in: ['ACTIVE', 'FEATURED'] } } },
          include: {
            tool: {
              include: TOOL_PRISMA_INCLUDE,
            },
          },
        },
      },
    }),
  );

  if (!category) notFound();

  const tools = category.tools.map((tc) => mapToolResponse(tc.tool)).filter(Boolean);

  return (
    <CategoryDetailClient
      category={{
        id: category.id,
        nameEn: category.nameEn,
        nameZh: category.nameZh,
        slug: category.slug,
        icon: category.icon,
        descriptionEn: category.descriptionEn ?? undefined,
        descriptionZh: category.descriptionZh ?? undefined,
      }}
      tools={tools}
    />
  );
}
