import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? "");
  }
  return _resend;
}

export interface SubmitNotificationParams {
  repoUrl: string;
  submitterName: string | null;
  notes?: string | null;
  submissionId: string;
}

export async function sendSubmitNotification(params: SubmitNotificationParams) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agenttoolhub.com";

  const html = [
    `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;">`,
    `<h2 style="color:#0f172a;">New Tool Submission</h2>`,
    `<table style="width:100%;border-collapse:collapse;">`,
    `<tr><td style="padding:8px 0;color:#64748b;">Repository</td>`,
    `<td style="padding:8px 0;"><a href="${params.repoUrl}" style="color:#3b82f6;">${params.repoUrl}</a></td></tr>`,
    `<tr><td style="padding:8px 0;color:#64748b;">Submitter</td>`,
    `<td style="padding:8px 0;">${params.submitterName ?? "Anonymous"}</td></tr>`,
    params.notes
      ? `<tr><td style="padding:8px 0;color:#64748b;">Notes</td><td style="padding:8px 0;">${params.notes}</td></tr>`
      : "",
    `</table>`,
    `<div style="margin-top:24px;">`,
    `<a href="${baseUrl}/en/admin/submissions" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;">Review in Admin</a>`,
    `</div>`,
    `</div>`,
  ].join("");

  const { error } = await getResend().emails.send({
    from: "AgentToolHub <onboarding@resend.dev>",
    to: adminEmail,
    subject: `New Tool Submission: ${params.repoUrl.split("/").slice(-2).join("/")}`,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export interface DigestTool {
  name: string;
  description: string;
  descriptionZh: string | null;
  stars: number;
  type: string;
  slug: string;
  score: number | null;
}

export interface DigestEmailParams {
  to: string;
  locale: "en" | "zh";
  tools: DigestTool[];
  unsubscribeToken: string;
  baseUrl: string;
}

export async function sendDigestEmail(params: DigestEmailParams) {
  const { renderDigestHtml } = await import("./email-templates/digest");
  const html = renderDigestHtml(params);

  const isZh = params.locale === "zh";
  const subject = isZh
    ? "AgentToolHub 本周精选 — 20 个热门 AI Agent 工具"
    : "AgentToolHub Weekly Digest — 20 Trending AI Agent Tools";

  const { error } = await getResend().emails.send({
    from: "AgentToolHub <onboarding@resend.dev>",
    to: params.to,
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${params.baseUrl}/${params.locale}/unsubscribe?token=${params.unsubscribeToken}>`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
