import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const FEATURES = [
  {
    title: "Comprehensive Directory",
    description: "Discover MCP Servers, Skills, and Rules across all major AI coding platforms.",
    icon: "🔍",
  },
  {
    title: "Multi-Platform Support",
    description: "Compatible with Claude Code, Cursor, Cline, OpenClaw, Windsurf, VS Code, and ChatGPT.",
    icon: "🖥️",
  },
  {
    title: "Easy Installation",
    description: "Copy-paste install commands and config snippets for every supported platform.",
    icon: "⚡",
  },
  {
    title: "Community Reviews",
    description: "Real ratings and reviews from developers using these tools in production.",
    icon: "⭐",
  },
  {
    title: "Weekly Rankings",
    description: "Stay up to date with trending tools, newest additions, and all-time favorites.",
    icon: "🏆",
  },
  {
    title: "Open Source First",
    description: "All listed tools are open source. Submit your own project for inclusion.",
    icon: "Open Source",
  },
];

const TECH_STACK = [
  { name: "Next.js 15", description: "React framework with App Router" },
  { name: "TypeScript", description: "Type-safe development" },
  { name: "Tailwind CSS", description: "Utility-first styling" },
  { name: "Prisma", description: "Database ORM" },
  { name: "Vercel", description: "Deployment and hosting" },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              AgentToolHub
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
              The ultimate discovery platform for AI Agent tools. Find the best
              MCP Servers, Skills, and Rules for your AI-powered coding workflow.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-tertiary)]">
              AI Agent 工具发现平台 — 为你的 AI 编程工作流找到最佳的 MCP
              Server、Skill 和 Rule。
            </p>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-[var(--text-primary)]">
              What We Offer
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 transition-all hover:shadow-[var(--shadow-md)]"
                >
                  <div className="mb-4 text-3xl">{feature.icon}</div>
                  <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-16 transition-theme">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-[var(--text-primary)]">
              Built With
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-5 py-4 transition-theme"
                >
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {tech.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {tech.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-t border-[var(--border)] py-16 transition-theme">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
              Our Mission
            </h2>
            <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
              The AI agent ecosystem is growing fast. Every week, new MCP Servers,
              Skills, and Rules are released. AgentToolHub exists to help
              developers discover, compare, and adopt the right tools for their
              workflow — across Claude Code, Cursor, Cline, and every platform that
              matters.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-tertiary)]">
              AI Agent 生态正在快速发展。AgentToolHub
              的使命是帮助开发者发现、比较和采用适合自己工作流的工具。
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
