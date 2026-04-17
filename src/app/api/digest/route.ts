import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { sendDigestEmail, type DigestTool } from "@/lib/resend";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

async function getDigestTools(): Promise<DigestTool[]> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const tools = await prisma.tool.findMany({
    where: {
      status: { in: ["ACTIVE", "FEATURED"] },
      createdAt: { gte: twoWeeksAgo },
    },
    select: {
      name: true,
      description: true,
      descriptionZh: true,
      stars: true,
      type: true,
      slug: true,
      score: true,
    },
    orderBy: { score: "desc" },
    take: 20,
  });

  return tools.map((t) => ({
    ...t,
    type: t.type as string,
  }));
}

async function ensureProTokens() {
  const users = await prisma.user.findMany({
    where: {
      isPro: true,
      proNewsletter: true,
      proToken: null,
    },
    select: { id: true },
  });

  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { proToken: randomBytes(32).toString("hex") },
    });
  }
}

function isCronRequest(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return ua.includes("vercel-cron");
}

// GET: Cron trigger or preview
export async function GET(request: Request) {
  const url = new URL(request.url);
  const isPreview = url.searchParams.get("preview") === "true";

  // Preview requires admin auth
  if (isPreview) {
    const { session, error } = await requireAuth();
    if (error) return error;
    if (!session?.user?.id) return errorResponse("Authentication required", 401);
    if (!isAdmin(session.user.id)) {
      return errorResponse("Admin access required", 403);
    }

    const tools = await getDigestTools();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agent-tool-hub.vercel.app";

    const { renderDigestHtml } = await import("@/lib/email-templates/digest");
    const html = renderDigestHtml({
      to: "",
      locale: "en",
      tools,
      unsubscribeToken: "preview-token",
      baseUrl,
    });

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Cron trigger — verify source
  if (!isCronRequest(request)) {
    const secret = url.searchParams.get("secret");
    if (secret !== process.env.CRON_SECRET) {
      return errorResponse("Unauthorized", 401);
    }
  }

  return runDigest();
}

// POST: Admin manual trigger
export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!session?.user?.id) return errorResponse("Authentication required", 401);
  if (!isAdmin(session.user.id)) {
    return errorResponse("Admin access required", 403);
  }

  return runDigest();
}

async function runDigest() {
  const start = Date.now();

  const tools = await getDigestTools();
  if (tools.length === 0) {
    return successResponse({ sent: 0, failed: 0, toolCount: 0, durationMs: Date.now() - start });
  }

  await ensureProTokens();

  const users = await prisma.user.findMany({
    where: {
      isPro: true,
      proNewsletter: true,
      email: { not: null },
    },
    select: { id: true, email: true, proToken: true },
  });

  if (users.length === 0) {
    return successResponse({ sent: 0, failed: 0, toolCount: tools.length, durationMs: Date.now() - start });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agent-tool-hub.vercel.app";
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await sendDigestEmail({
        to: user.email!,
        locale: "en",
        tools,
        unsubscribeToken: user.proToken!,
        baseUrl,
      });

      await prisma.digestSend.create({
        data: {
          userId: user.id,
          toolCount: tools.length,
          status: "sent",
        },
      });
      sent++;
    } catch (err) {
      await prisma.digestSend.create({
        data: {
          userId: user.id,
          toolCount: tools.length,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      });
      failed++;
    }
  }

  return successResponse({
    sent,
    failed,
    toolCount: tools.length,
    durationMs: Date.now() - start,
  });
}
