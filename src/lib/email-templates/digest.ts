import type { DigestTool, DigestEmailParams } from "../resend";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function typeLabel(type: string, locale: "en" | "zh"): string {
  if (locale === "zh") {
    if (type === "MCP_SERVER") return "MCP 服务器";
    if (type === "SKILL") return "Skill";
    if (type === "RULE") return "Rule";
  }
  if (type === "MCP_SERVER") return "MCP Server";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function renderToolCard(
  tool: DigestTool,
  index: number,
  locale: "en" | "zh",
  baseUrl: string
): string {
  const desc =
    locale === "zh" && tool.descriptionZh
      ? tool.descriptionZh
      : tool.description;
  const toolUrl = `${baseUrl}/${locale}/tools/${tool.slug}`;

  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="36" valign="top" style="padding-top:2px;">
              <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:#f3f4f6;border-radius:8px;font-size:13px;font-weight:600;color:#6b7280;">
                ${index + 1}
              </span>
            </td>
            <td style="padding-left:8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${toolUrl}" style="font-size:15px;font-weight:600;color:#111827;text-decoration:none;">
                      ${escapeHtml(tool.name)}
                    </a>
                    <span style="margin-left:8px;display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background:#eef2ff;color:#4f46e5;">
                      ${typeLabel(tool.type, locale)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="font-size:13px;color:#6b7280;">
                      ${escapeHtml(desc.length > 120 ? desc.slice(0, 120) + "..." : desc)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:6px;">
                    <span style="font-size:12px;color:#9ca3af;">
                      ★ ${formatStars(tool.stars)}
                      ${tool.score != null ? ` &middot; Score: ${tool.score.toFixed(0)}` : ""}
                    </span>
                    <a href="${toolUrl}" style="margin-left:12px;font-size:12px;font-weight:500;color:#4f46e5;text-decoration:none;">
                      ${locale === "zh" ? "查看详情 →" : "View Tool →"}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderDigestHtml(params: DigestEmailParams): string {
  const { locale, tools, unsubscribeToken, baseUrl } = params;
  const isZh = locale === "zh";
  const date = new Date().toLocaleDateString(isZh ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const title = isZh ? "AgentToolHub 本周精选" : "AgentToolHub Weekly Digest";
  const subtitle = isZh
    ? `${tools.length} 个热门 AI Agent 工具`
    : `${tools.length} Trending AI Agent Tools`;
  const headerDesc = isZh
    ? "为你精选本周最受欢迎的新工具"
    : "The most popular new tools curated for you this week";
  const unsubscribeUrl = `${baseUrl}/${locale}/unsubscribe?token=${unsubscribeToken}`;
  const footerText = isZh
    ? "你收到此邮件是因为订阅了 AgentToolHub Pro 周报。"
    : "You're receiving this because you subscribed to the AgentToolHub Pro Weekly Digest.";

  const toolCards = tools
    .map((tool, i) => renderToolCard(tool, i, locale, baseUrl))
    .join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
                ${title}
              </h1>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">
                ${date} &middot; ${subtitle}
              </p>
            </td>
          </tr>
          <!-- Intro -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0;font-size:14px;color:#6b7280;">
                ${headerDesc}
              </p>
            </td>
          </tr>
          <!-- Tools -->
          <tr>
            <td style="padding:8px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${toolCards}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:20px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">
                      AgentToolHub
                    </p>
                    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
                      ${footerText}
                    </p>
                    <a href="${unsubscribeUrl}" style="font-size:12px;color:#6b7280;text-decoration:underline;">
                      ${isZh ? "取消订阅" : "Unsubscribe"}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
