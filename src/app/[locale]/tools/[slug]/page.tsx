import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS } from "@/lib/mock-data";
import type { Tool } from "@/types";
import ToolDetailClient from "./ToolDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/tools/${slug}`, { cache: "no-store" });
    if (!res.ok) return { title: "Tool Not Found" };
    const { data: tool } = await res.json();
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
  try {
    const res = await fetch(`${API_BASE}/api/tools/${slug}`, { cache: "no-store" });
    if (!res.ok) notFound();
    const { data: tool } = await res.json();
    if (!tool) notFound();

    return (
      <>
        <ToolDetailClient tool={tool} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(tool)) }}
        />
      </>
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    notFound();
  }
}
