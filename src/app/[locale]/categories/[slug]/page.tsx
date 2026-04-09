import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/mock-data';
import CategoryDetailClient from './CategoryDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return CATEGORIES.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: `${category.nameEn} Tools — AgentToolHub`,
    description:
      category.descriptionEn ??
      `Discover the best ${category.nameEn} tools for AI agents.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/categories/${slug}`, { cache: 'no-store' });
    if (!res.ok) notFound();
    const { data: category } = await res.json();
    if (!category) notFound();

    return (
      <CategoryDetailClient category={category} tools={category.tools ?? []} />
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    notFound();
  }
}
