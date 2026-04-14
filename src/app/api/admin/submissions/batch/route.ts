import { requireAuth, isAdmin } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/api-utils";
import { approveSubmission, rejectSubmission } from "@/lib/approve-tool";

export const dynamic = "force-dynamic";

interface BatchProgressEvent {
  id: string;
  status: "approved" | "rejected" | "error";
  toolId?: string;
  error?: string;
}

interface BatchDoneEvent {
  type: "done";
  total: number;
  succeeded: number;
  failed: number;
}

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/admin/submissions/batch
 * Batch approve/reject submissions with SSE progress stream.
 */
export async function POST(request: Request): Promise<Response> {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  if (!isAdmin(userId)) {
    return errorResponse("Forbidden", 403);
  }

  let body: { submissionIds?: string[]; action?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const { submissionIds, action } = body;
  if (
    !Array.isArray(submissionIds) ||
    submissionIds.length === 0 ||
    !["approve", "reject"].includes(action ?? "")
  ) {
    return errorResponse("submissionIds (non-empty array) and action (approve|reject) required", 400);
  }

  const ids = submissionIds.slice(0, 50); // safety cap
  const isApprove = action === "approve";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let succeeded = 0;
      let failed = 0;

      if (!isApprove) {
        // Reject is cheap — no GLM calls, do them all then send done
        for (const id of ids) {
          try {
            const result = await rejectSubmission(id);
            if (result.success) {
              succeeded++;
              controller.enqueue(encoder.encode(
                sseEncode("progress", { id, status: "rejected" } satisfies BatchProgressEvent),
              ));
            } else {
              failed++;
              controller.enqueue(encoder.encode(
                sseEncode("progress", { id, status: "error", error: result.error } satisfies BatchProgressEvent),
              ));
            }
          } catch (err) {
            failed++;
            controller.enqueue(encoder.encode(
              sseEncode("progress", { id, status: "error", error: String(err) } satisfies BatchProgressEvent),
            ));
          }
        }
      } else {
        // Approve is expensive — serial processing due to GLM concurrency limit
        for (const id of ids) {
          try {
            const result = await approveSubmission(id);
            if (result.success) {
              succeeded++;
              controller.enqueue(encoder.encode(
                sseEncode("progress", { id, status: "approved", toolId: result.toolId } satisfies BatchProgressEvent),
              ));
            } else {
              failed++;
              controller.enqueue(encoder.encode(
                sseEncode("progress", { id, status: "error", error: result.error } satisfies BatchProgressEvent),
              ));
            }
          } catch (err) {
            failed++;
            controller.enqueue(encoder.encode(
              sseEncode("progress", { id, status: "error", error: String(err) } satisfies BatchProgressEvent),
            ));
          }
        }
      }

      controller.enqueue(encoder.encode(
        sseEncode("done", { type: "done", total: ids.length, succeeded, failed } satisfies BatchDoneEvent),
      ));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
