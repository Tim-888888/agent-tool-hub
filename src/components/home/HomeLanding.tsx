'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Code2,
  Database,
  FileCode2,
  Filter,
  FolderOpen,
  GitBranch,
  Globe2,
  Heart,
  Layers3,
  Search,
  Scale,
  ShieldCheck,
  Star,
  Trophy,
  Upload,
  Wrench,
  Zap,
} from 'lucide-react';
import { useI18n, localePath } from '@/lib/i18n-context';
import { formatStars } from '@/lib/utils';
import type { Category, Tool } from '@/types';

interface HomeLandingProps {
  stats: { tools: number; platforms: number; categories: number };
  featuredTools: Tool[];
  newestTools: Tool[];
  categories: Category[];
}

interface ToolPreview {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: Tool['type'];
  stars: number;
  avgRating: number;
  author?: string;
}

const fallbackTools: ToolPreview[] = [
  {
    id: 'demo-filesystem',
    name: 'Filesystem MCP',
    slug: 'filesystem-mcp',
    description: 'Secure file access for AI agents with granular permissions.',
    type: 'MCP_SERVER',
    stars: 2400,
    avgRating: 4.8,
    author: 'modelcontextprotocol',
  },
  {
    id: 'demo-postgres',
    name: 'Postgres MCP',
    slug: 'postgres-mcp',
    description: 'Natural language interface to Postgres databases.',
    type: 'MCP_SERVER',
    stars: 1800,
    avgRating: 4.7,
    author: 'supabase',
  },
  {
    id: 'demo-search',
    name: 'Web Search',
    slug: 'brave-search-mcp',
    description: 'High-quality web search with source citations.',
    type: 'SKILL',
    stars: 1600,
    avgRating: 4.6,
    author: 'playwright',
  },
  {
    id: 'demo-review',
    name: 'Code Reviewer Rule Set',
    slug: 'tools',
    description: 'AI rules for consistent, actionable code reviews.',
    type: 'RULE',
    stars: 1200,
    avgRating: 4.7,
    author: 'codimail',
  },
  {
    id: 'demo-git',
    name: 'Git Automation',
    slug: 'tools',
    description: 'Automate git workflows and PR management.',
    type: 'MCP_SERVER',
    stars: 987,
    avgRating: 4.5,
    author: 'agirre',
  },
  {
    id: 'demo-browser',
    name: 'Browser Use',
    slug: 'tools',
    description: 'Control and extract data from real browsers.',
    type: 'SKILL',
    stars: 843,
    avgRating: 4.6,
    author: 'browser-use',
  },
];

const platformNames = ['Claude Code', 'Cursor', 'Cline', 'OpenClaw', 'VS Code', 'ChatGPT'];

const workflowSteps = [
  {
    title: 'Search Smarter',
    text: 'Find the right tools fast with filters and tags.',
    Icon: Search,
  },
  {
    title: 'Compare Confidently',
    text: 'Review features, ratings, and platforms side by side.',
    Icon: Scale,
  },
  {
    title: 'Save Favorites',
    text: 'Build a personal toolkit for repeat workflows.',
    Icon: Heart,
  },
  {
    title: 'Submit Tools',
    text: 'Share useful repositories with the community.',
    Icon: Upload,
  },
  {
    title: 'Track Rankings',
    text: 'Spot trusted tools by category and momentum.',
    Icon: Trophy,
  },
];

const communityLinks = [
  {
    title: 'Top Contributors',
    text: 'See who is building for the community.',
    Icon: Bot,
  },
  {
    title: 'Collections',
    text: 'Curated tool collections by use case.',
    Icon: Layers3,
  },
  {
    title: 'Recent Activity',
    text: 'Stay current with new tools and updates.',
    Icon: BarChart3,
  },
];

function toPreview(tool: Tool): ToolPreview {
  return {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    description: tool.description,
    type: tool.type,
    stars: tool.stars,
    avgRating: tool.avgRating,
    author: tool.author,
  };
}

function getDisplayTools(tools: Tool[], count: number): ToolPreview[] {
  const realTools = tools.map(toPreview);
  const merged = realTools.length >= count ? realTools : [...realTools, ...fallbackTools];
  return merged.slice(0, count);
}

function typeLabel(type: Tool['type']): string {
  if (type === 'MCP_SERVER') return 'MCP';
  if (type === 'SKILL') return 'Skill';
  return 'Rule';
}

function typeClassName(type: Tool['type']): string {
  if (type === 'MCP_SERVER') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (type === 'SKILL') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function ToolGlyph({ tool, className }: { tool: ToolPreview; className: string }) {
  const name = tool.name.toLowerCase();

  if (name.includes('postgres') || name.includes('database')) {
    return <Database className={className} strokeWidth={2.2} />;
  }
  if (name.includes('file')) {
    return <FolderOpen className={className} strokeWidth={2.2} />;
  }
  if (name.includes('search') || name.includes('web')) {
    return <Globe2 className={className} strokeWidth={2.2} />;
  }
  if (name.includes('git')) {
    return <GitBranch className={className} strokeWidth={2.2} />;
  }
  if (name.includes('security')) {
    return <ShieldCheck className={className} strokeWidth={2.2} />;
  }
  if (tool.type === 'RULE') {
    return <FileCode2 className={className} strokeWidth={2.2} />;
  }
  if (tool.type === 'SKILL') {
    return <Bot className={className} strokeWidth={2.2} />;
  }
  return <Code2 className={className} strokeWidth={2.2} />;
}

function toolMarkClass(type: Tool['type']): string {
  if (type === 'MCP_SERVER') return 'bg-blue-600 text-white';
  if (type === 'SKILL') return 'bg-emerald-600 text-white';
  return 'bg-amber-500 text-white';
}

function ToolIcon({ tool, compact = false }: { tool: ToolPreview; compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${toolMarkClass(tool.type)} ${
        compact ? 'h-8 w-8' : 'h-10 w-10'
      }`}
    >
      <ToolGlyph tool={tool} className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  );
}

function ProductPreview({ tools }: { tools: ToolPreview[] }) {
  const rows = tools.slice(0, 7);
  const compareTools = rows.slice(0, 3);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{'Search tools, e.g. "files", "memory", "browser"...'}</span>
          <kbd className="ml-auto hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
            /K
          </kbd>
        </div>
        <button className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 sm:inline-flex">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </button>
      </div>

      <div className="grid min-h-[430px] lg:grid-cols-[150px_minmax(0,1fr)_210px]">
        <aside className="hidden border-r border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 lg:block">
          <p className="mb-3 font-semibold text-slate-950">Categories</p>
          {['All Tools', 'MCP Servers', 'Skills', 'Rules', 'Data & APIs', 'Development'].map(
            (item, index) => (
              <div
                key={item}
                className={`mb-1 flex items-center justify-between rounded-md px-2 py-2 ${
                  index === 0 ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                <span>{item}</span>
                <span className="text-[10px] text-slate-400">{index === 0 ? '2,843' : ''}</span>
              </div>
            ),
          )}
        </aside>

        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(150px,1fr)_58px_78px_64px] gap-x-3 border-b border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-500 max-md:grid-cols-[1fr_64px_72px]">
            <span>Tool</span>
            <span>Type</span>
            <span className="max-md:hidden">Apps</span>
            <span>Stars</span>
          </div>
          {rows.map((tool) => (
            <div
              key={tool.id}
              className="grid grid-cols-[minmax(150px,1fr)_58px_78px_64px] items-center gap-x-3 border-b border-slate-100 px-4 py-3 text-sm max-md:grid-cols-[1fr_64px_72px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ToolIcon tool={tool} compact />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{tool.name}</p>
                  <p className="truncate text-xs text-slate-500">by {tool.author ?? 'community'}</p>
                </div>
              </div>
              <span
                className={`w-fit rounded-md border px-2 py-1 text-[11px] font-semibold ${typeClassName(
                  tool.type,
                )}`}
              >
                {typeLabel(tool.type)}
              </span>
              <div className="flex items-center gap-1 text-slate-400 max-md:hidden" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="h-2 w-2 rounded-full bg-slate-800" />
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                <Star className="h-3.5 w-3.5 fill-slate-800 text-slate-800" />
                {formatStars(tool.stars)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
            <span>Showing 1-7 of {formatStars(2843)} tools</span>
            <span className="font-semibold text-blue-600">View all</span>
          </div>
        </div>

        <aside className="hidden border-l border-slate-200 bg-white p-4 lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-950">Compare</h3>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">3</span>
          </div>
          <div className="space-y-3">
            {compareTools.map((tool) => (
              <div key={tool.id} className="flex items-center gap-3">
                <ToolIcon tool={tool} compact />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-950">{tool.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{tool.author ?? 'community'}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]">
            Compare (3)
          </button>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-bold text-slate-950">At a glance</p>
            {['Avg. Rating', 'Reliability', 'Updated'].map((label, index) => (
              <div key={label} className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-slate-800">
                  {index === 0 ? '4.7' : index === 1 ? '94%' : 'today'}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PlatformStrip() {
  return (
    <div className="mt-9">
      <p className="text-sm font-medium text-slate-600">Works with the tools you use</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        {platformNames.map((name, index) => (
          <span key={name} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span
              className={`h-4 w-4 rounded ${
                index % 3 === 0 ? 'bg-orange-500' : index % 3 === 1 ? 'bg-slate-800' : 'bg-blue-600'
              }`}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatStrip({ stats }: { stats: HomeLandingProps['stats'] }) {
  const items = [
    { value: stats.tools || 2843, label: 'Tools' },
    { value: 18692, label: 'Developers' },
    { value: 4912, label: 'Collections' },
    { value: 126, label: 'Contributors' },
  ];

  return (
    <div className="mt-9 grid max-w-2xl grid-cols-2 gap-y-5 sm:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`${index > 0 ? 'sm:border-l sm:border-slate-200 sm:pl-7' : ''}`}
        >
          <p className="text-2xl font-bold text-slate-950">{formatStars(item.value)}</p>
          <p className="mt-1 text-sm text-slate-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolPreview }) {
  const { locale } = useI18n();
  const href =
    tool.slug === 'tools' || tool.id.startsWith('demo-')
      ? localePath(locale, '/tools')
      : localePath(locale, `/tools/${tool.slug}`);

  return (
    <Link
      href={href}
      className="group flex min-h-[150px] flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start gap-3">
        <ToolIcon tool={tool} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-bold leading-5 text-slate-950 group-hover:text-blue-600">
            {tool.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500">by {tool.author ?? 'community'}</p>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{tool.description}</p>
      <div className="mt-auto flex items-center justify-between pt-4 text-xs">
        <span className="flex items-center gap-1 font-semibold text-slate-700">
          <Star className="h-3.5 w-3.5 fill-slate-800 text-slate-800" />
          {formatStars(tool.stars)}
        </span>
        <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
          {tool.avgRating.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

function ToolSection({
  title,
  tools,
  href,
}: {
  title: string;
  tools: ToolPreview[];
  href: string;
}) {
  const { locale } = useI18n();

  return (
    <section aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>
      <div className="mb-5 flex items-center justify-between">
        <h2 id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`} className="text-xl font-bold text-slate-950">
          {title}
        </h2>
        <Link
          href={localePath(locale, href)}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tools.slice(0, 4).map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function WorkflowBand() {
  return (
    <section className="border-y border-slate-200 bg-white" aria-label="Built for AI agent workflows">
      <div className="mx-auto grid max-w-7xl gap-px px-5 py-5 sm:px-6 lg:grid-cols-[1.1fr_repeat(5,1fr)] lg:px-8">
        <div className="flex items-center pr-6">
          <h2 className="max-w-[210px] text-xl font-bold leading-7 text-slate-950">
            Built for how you build with agents
          </h2>
        </div>
        {workflowSteps.map(({ title, text, Icon }) => (
          <div key={title} className="flex gap-4 border-t border-slate-200 py-4 lg:border-l lg:border-t-0 lg:px-6">
            <Icon className="mt-1 h-7 w-7 shrink-0 text-slate-700" strokeWidth={1.8} />
            <div>
              <h3 className="font-bold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryIcon({ icon }: { icon: string }) {
  const normalized = icon.toLowerCase();

  if (normalized.includes('database')) {
    return <Database className="h-7 w-7 text-slate-700" strokeWidth={1.8} />;
  }
  if (normalized.includes('wrench')) {
    return <Wrench className="h-7 w-7 text-slate-700" strokeWidth={1.8} />;
  }
  if (normalized.includes('zap')) {
    return <Zap className="h-7 w-7 text-slate-700" strokeWidth={1.8} />;
  }
  if (normalized.includes('shield')) {
    return <ShieldCheck className="h-7 w-7 text-slate-700" strokeWidth={1.8} />;
  }
  if (normalized.includes('search')) {
    return <Search className="h-7 w-7 text-slate-700" strokeWidth={1.8} />;
  }
  return <Code2 className="h-7 w-7 text-slate-700" strokeWidth={1.8} />;
}

function LowerSections({ categories }: { categories: Category[] }) {
  const { locale } = useI18n();
  const visibleCategories = categories.slice(0, 6);

  return (
    <section className="bg-white py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1.25fr_0.85fr_1.15fr] lg:px-8">
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950">Categories</h2>
            <Link
              href={localePath(locale, '/tools')}
              className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(visibleCategories.length ? visibleCategories : []).map((category) => (
              <Link
                key={category.id}
                href={localePath(locale, `/categories/${category.slug}`)}
                className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-4 text-center transition hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.07)]"
              >
                <CategoryIcon icon={category.icon} />
                <span className="mt-4 text-sm font-bold text-slate-950">
                  {locale === 'zh' ? category.nameZh : category.nameEn}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-5 text-xl font-bold text-slate-950">Community</h2>
          <div className="space-y-5">
            {communityLinks.map(({ title, text, Icon }) => (
              <Link
                key={title}
                href={localePath(
                  locale,
                  title === 'Top Contributors'
                    ? '/contributors'
                    : title === 'Collections'
                      ? '/collections'
                      : '/rankings',
                )}
                className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-200"
              >
                <Icon className="h-6 w-6 shrink-0 text-slate-700" strokeWidth={1.8} />
                <span>
                  <span className="block font-bold text-slate-950">{title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-bold text-slate-950">Pro Weekly Digest</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Get the best new tools, updates, and insights for AI agent builders every week.
          </p>
          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="sr-only" htmlFor="digest-email">
              Email address
            </label>
            <input
              id="digest-email"
              type="email"
              placeholder="Enter your email"
              className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] hover:bg-blue-700">
              Subscribe
            </button>
          </form>
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Join 18,692+ developers
          </p>
        </div>
      </div>
    </section>
  );
}

export default function HomeLanding({
  stats,
  featuredTools,
  newestTools,
  categories,
}: HomeLandingProps) {
  const { locale } = useI18n();
  const heroTools = getDisplayTools(featuredTools.length ? featuredTools : newestTools, 7);
  const featured = getDisplayTools(featuredTools, 4);
  const newest = getDisplayTools(newestTools, 4);

  return (
    <main className="flex-1 bg-white text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-10 pt-12 sm:px-6 lg:grid-cols-[500px_minmax(0,1fr)] lg:px-8 lg:pb-12 lg:pt-12">
          <div className="flex min-w-0 flex-col">
            <h1 className="max-w-3xl text-5xl font-bold leading-[0.98] text-slate-950 sm:text-6xl lg:text-7xl">
              AgentToolHub
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-8 text-slate-600">
              Discover AI agent tools that actually fit your workflow
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={localePath(locale, '/tools')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
              >
                Browse Tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={localePath(locale, '/tools/compare')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-6 text-base font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                Compare Tools
                <Scale className="h-4 w-4" />
              </Link>
            </div>
            <PlatformStrip />
            <StatStrip stats={stats} />
          </div>

          <div className="min-w-0 lg:pl-2">
            <ProductPreview tools={heroTools} />
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:px-8 xl:grid-cols-2">
          <ToolSection title="Featured Tools" tools={featured} href="/tools" />
          <ToolSection title="Newest Tools" tools={newest} href="/tools" />
        </div>
      </section>

      <WorkflowBand />
      <LowerSections categories={categories} />
    </main>
  );
}
