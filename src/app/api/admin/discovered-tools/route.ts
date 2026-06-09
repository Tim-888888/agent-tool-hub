import { z } from "zod";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { approveDiscoveredTool, rejectDiscoveredTool } from "@/lib/approve-tool";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  toolId: z.string(),
  action: z.enum(["approve", "reject"]),
});

/**
 * PATCH /api/admin/discovered-tools
 * Admin-only: approve or reject an auto-discovered tool.
 */
export async function PATCH(request: Request): Promise<Response> {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  let validated: z.infer<typeof actionSchema>;
  try {
    const body = await request.json();
    validated = actionSchema.parse(body);
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { toolId, action } = validated;

  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  if (!tool || tool.status !== "PENDING") {
    return errorResponse("Tool not found or not in PENDING status", 404);
  }

  const result = action === "reject"
    ? await rejectDiscoveredTool(toolId)
    : await approveDiscoveredTool(toolId);

  if (!result.success) {
    return errorResponse(result.error ?? "Unable to update discovered tool", 400);
  }

  return successResponse({ status: action === "reject" ? "ARCHIVED" : "ACTIVE" });
}
