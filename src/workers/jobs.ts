import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

type JobKind = "sync" | "discover" | "skills-sh" | "skills-sh-enrich" | "digest";

interface JobParams {
  kind: JobKind;
  requestedAt?: string;
}

const JOB_ENDPOINTS: Record<JobKind, string> = {
  sync: "/api/sync",
  discover: "/api/discover",
  "skills-sh": "/api/skills-sh",
  "skills-sh-enrich": "/api/skills-sh/enrich",
  digest: "/api/digest",
};

const CRON_TO_JOB: Record<string, JobKind> = {
  "0 2 * * *": "sync",
  "0 3 * * 1": "discover",
  "0 4 * * *": "skills-sh",
  "0 5 * * *": "skills-sh-enrich",
  "0 6 * * 1": "digest",
};

export class AgentToolHubWorkflow extends WorkflowEntrypoint<CloudflareEnv, JobParams> {
  async run(event: WorkflowEvent<JobParams>, step: WorkflowStep) {
    const kind = event.payload.kind;

    await step.do(`run ${kind}`, async () => {
      await triggerAppJob(this.env, kind);
    });
  }
}

async function triggerAppJob(env: CloudflareEnv, kind: JobKind) {
  const appUrl = env.AGENT_TOOL_HUB_APP_URL;
  if (!appUrl) {
    throw new Error("AGENT_TOOL_HUB_APP_URL is required");
  }

  const endpoint = JOB_ENDPOINTS[kind];
  const response = await fetch(new URL(endpoint, appUrl), {
    method: "GET",
    headers: {
      "authorization": env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : "",
      "user-agent": "agent-tool-hub-cloudflare-workflows",
      "x-agent-tool-hub-cron": "cloudflare",
    },
  });

  if (!response.ok) {
    throw new Error(`${kind} failed: ${response.status} ${await response.text()}`);
  }
}

export default {
  async scheduled(controller: ScheduledController, env: CloudflareEnv) {
    const kind = CRON_TO_JOB[controller.cron];
    if (!kind) return;

    await env.AGENT_TOOL_HUB_JOBS?.create({
      id: `${kind}-${controller.scheduledTime}`,
      params: { kind, requestedAt: new Date(controller.scheduledTime).toISOString() },
    });
  },

  async fetch(request: Request, env: CloudflareEnv) {
    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    const auth = request.headers.get("authorization");
    if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const kind = url.searchParams.get("job") as JobKind | null;
    if (!kind || !(kind in JOB_ENDPOINTS)) {
      return new Response("Invalid job", { status: 400 });
    }

    const instance = await env.AGENT_TOOL_HUB_JOBS?.create({
      id: `${kind}-${Date.now()}`,
      params: { kind, requestedAt: new Date().toISOString() },
    });

    return Response.json({ ok: true, id: instance?.id });
  },
};
