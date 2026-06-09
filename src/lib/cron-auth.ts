import { errorResponse } from "@/lib/api-utils";

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret) {
    return authHeader === `Bearer ${secret}`;
  }

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return true;
  }

  return request.headers.get("x-agent-tool-hub-cron") === "cloudflare";
}

export function requireCronRequest(request: Request): Response | null {
  if (isAuthorizedCronRequest(request)) {
    return null;
  }

  return errorResponse("Unauthorized", 401);
}
