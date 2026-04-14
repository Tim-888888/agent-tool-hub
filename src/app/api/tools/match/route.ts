import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

interface MatchRequest {
  languages: string[];
  useCases: string[];
  agentTool: string;
  budget: string;
}

export async function POST(request: Request) {
  const limited = checkRateLimit(request, RATE_LIMITS.search);
  if (limited) return limited;

  try {
    const body: MatchRequest = await request.json();
    const { languages, useCases, agentTool, budget } = body;

    if (!languages?.length || !useCases?.length || !agentTool) {
      return errorResponse("languages, useCases, and agentTool are required", 400);
    }

    // Fetch active/featured tools to provide context to GLM
    const tools = await prisma.tool.findMany({
      where: { status: { in: ["ACTIVE", "FEATURED"] } },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        stars: true,
        language: true,
        tags: true,
        categories: { include: { category: { select: { slug: true, nameEn: true } } } },
      },
      orderBy: { stars: "desc" },
      take: 80,
    });

    // Build tool catalog for GLM
    const toolCatalog = tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description?.slice(0, 100),
      type: t.type,
      stars: t.stars,
      language: t.language,
      categories: t.categories.map((c) => c.category.slug),
    }));

    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      // Fallback: return top tools matching categories
      return successResponse(getFallbackRecommendations(tools, useCases));
    }

    const systemPrompt = `You are an AI tool recommendation expert. Given a user's preferences and a catalog of tools, recommend the 3-5 best matching tools.

OUTPUT FORMAT — return a single JSON array:
[
  {
    "toolId": "exact tool id from catalog",
    "reason": "1-2 sentence explanation of why this tool matches",
    "matchScore": 85
  }
]

RULES:
1. Only recommend tools from the provided catalog (use exact toolId)
2. matchScore should be 60-100, reflecting how well the tool matches
3. Sort by matchScore descending (best match first)
4. Return exactly 3-5 recommendations
5. Consider the user's programming languages, use cases, agent tool, and budget preference
6. Do NOT include any text outside the JSON array`;

    const userContent = `User preferences:
- Programming languages: ${languages.join(", ")}
- Use cases: ${useCases.join(", ")}
- AI agent tool: ${agentTool}
- Budget: ${budget}

Available tools catalog:
${JSON.stringify(toolCatalog, null, 0)}`;

    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return successResponse(getFallbackRecommendations(tools, useCases));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      return successResponse(getFallbackRecommendations(tools, useCases));
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return successResponse(getFallbackRecommendations(tools, useCases));
    }

    const recommendations = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(recommendations)) {
      return successResponse(getFallbackRecommendations(tools, useCases));
    }

    // Enrich recommendations with full tool data
    const toolMap = new Map(tools.map((t) => [t.id, t]));
    const enriched = recommendations
      .filter((r: { toolId: string }) => toolMap.has(r.toolId))
      .slice(0, 5)
      .map((r: { toolId: string; reason: string; matchScore: number }) => {
        const tool = toolMap.get(r.toolId)!;
        return {
          ...tool,
          reason: r.reason,
          matchScore: r.matchScore,
        };
      });

    return successResponse(enriched.length > 0 ? enriched : getFallbackRecommendations(tools, useCases));
  } catch (error) {
    console.error("AI match failed:", error);
    return errorResponse("AI match failed", 500);
  }
}

function getFallbackRecommendations(
  tools: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    stars: number;
    language: string | null;
    tags: string[];
    categories: { category: { slug: string } }[];
  }[],
  useCases: string[],
) {
  // Simple category-based matching
  const useCaseToCategory: Record<string, string[]> = {
    "Web Development": ["development", "api"],
    "API Integration": ["api", "development"],
    "Data Analysis": ["data-analysis", "database"],
    "Automation": ["productivity", "development"],
    "Security Testing": ["security"],
    "Code Generation": ["ai-ml", "development"],
  };

  const targetCategories = new Set(
    useCases.flatMap((uc) => useCaseToCategory[uc] || ["development"]),
  );

  const scored = tools.map((tool) => {
    const toolCategories = tool.categories.map((c) => c.category.slug);
    const categoryMatch = toolCategories.some((c) => targetCategories.has(c));
    return {
      ...tool,
      reason: categoryMatch ? "Matches your use case categories" : "Popular tool in the ecosystem",
      matchScore: categoryMatch ? 80 : 60,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore || b.stars - a.stars);
  return scored.slice(0, 5);
}
