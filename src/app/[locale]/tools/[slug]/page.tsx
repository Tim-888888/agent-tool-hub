import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TOOL_PRISMA_INCLUDE, mapToolResponse } from "@/lib/api-utils";
import { withRetry } from "@/lib/retry";
import type { Tool } from "@/types";
import ToolDetailClient from "./ToolDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tool = await withRetry(() =>
      prisma.tool.findUnique({ where: { slug } }),
    );
    if (!tool) return { title: "Tool Not Found" };

    return {
      title: `${tool.name} — AgentToolHub`,
      description: tool.description,
      openGraph: {
        title: `${tool.name} — AgentToolHub`,
        description: tool.description,
        type: "article",
      },
    };
  } catch {
    return { title: "Tool Not Found" };
  }
}

function buildJsonLd(tool: Tool): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: `https://agenttoolhub.com/tools/${tool.slug}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: tool.avgRating.toFixed(1),
      reviewCount: tool.ratingCount,
      bestRating: "5",
      worstRating: "1",
    },
    programmingLanguage: tool.language ?? undefined,
    license: tool.license ?? undefined,
    author: tool.author ? { "@type": "Organization", name: tool.author } : undefined,
    codeRepository: tool.repoUrl,
  };
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const raw = await withRetry(() =>
    prisma.tool.findUnique({
      where: { slug },
      include: {
        categories: { include: { category: true } },
        platforms: { include: { platform: true } },
      },
    }),
  );

  if (!raw) notFound();

  const tool = mapToolResponse(raw);

  return (
    <>
      <ToolDetailClient tool={tool} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(tool)) }}
      />
    </>
  );
}
