import { PrismaClient, ToolType, ToolStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// --- Data extracted from src/lib/mock-data.ts ---
// Duplicated here because the seed script runs outside Next.js (no @/ path aliases)

const PLATFORMS = [
  { slug: 'claude-code', name: 'Claude Code', icon: 'Bot', configKey: 'claude-code' },
  { slug: 'cursor', name: 'Cursor', icon: 'MousePointer', configKey: 'cursor' },
  { slug: 'cline', name: 'Cline', icon: 'Code', configKey: 'cline' },
  { slug: 'openclaw', name: 'OpenClaw', icon: 'Hand', configKey: 'openclaw' },
  { slug: 'windsurf', name: 'Windsurf', icon: 'Wind', configKey: 'windsurf' },
  { slug: 'vscode', name: 'VS Code', icon: 'Square', configKey: 'vscode' },
  { slug: 'chatgpt', name: 'ChatGPT', icon: 'MessageCircle', configKey: 'chatgpt' },
];

const CATEGORIES = [
  { slug: 'database', nameEn: 'Database', nameZh: '数据库', icon: 'Database', descriptionEn: 'Connect to databases and query data', descriptionZh: '连接数据库并查询数据', order: 1 },
  { slug: 'development', nameEn: 'Development', nameZh: '开发工具', icon: 'Wrench', descriptionEn: 'Developer tools and utilities', descriptionZh: '开发者工具和实用程序', order: 2 },
  { slug: 'api', nameEn: 'API Integration', nameZh: 'API 集成', icon: 'Plug', descriptionEn: 'Integrate with external APIs', descriptionZh: '集成外部 API', order: 3 },
  { slug: 'filesystem', nameEn: 'File System', nameZh: '文件系统', icon: 'FolderOpen', descriptionEn: 'File and document management', descriptionZh: '文件和文档管理', order: 4 },
  { slug: 'search', nameEn: 'Search', nameZh: '搜索', icon: 'Search', descriptionEn: 'Web and content search', descriptionZh: '网页和内容搜索', order: 5 },
  { slug: 'communication', nameEn: 'Communication', nameZh: '通信', icon: 'Mail', descriptionEn: 'Email, messaging, and notifications', descriptionZh: '邮件、消息和通知', order: 6 },
  { slug: 'data-analysis', nameEn: 'Data Analysis', nameZh: '数据分析', icon: 'BarChart3', descriptionEn: 'Data processing and visualization', descriptionZh: '数据处理和可视化', order: 7 },
  { slug: 'security', nameEn: 'Security', nameZh: '安全', icon: 'Shield', descriptionEn: 'Security auditing and monitoring', descriptionZh: '安全审计和监控', order: 8 },
  { slug: 'media', nameEn: 'Media', nameZh: '媒体', icon: 'Image', descriptionEn: 'Image, video, and audio processing', descriptionZh: '图片、视频和音频处理', order: 9 },
  { slug: 'productivity', nameEn: 'Productivity', nameZh: '生产力', icon: 'Zap', descriptionEn: 'Workflow automation and productivity', descriptionZh: '工作流自动化和生产力', order: 10 },
  { slug: 'cloud', nameEn: 'Cloud Services', nameZh: '云服务', icon: 'Cloud', descriptionEn: 'Cloud platform integrations', descriptionZh: '云平台集成', order: 11 },
  { slug: 'ai-ml', nameEn: 'AI / ML', nameZh: 'AI / ML', icon: 'Brain', descriptionEn: 'AI models and machine learning', descriptionZh: 'AI 模型和机器学习', order: 12 },
];

interface ToolSeed {
  slug: string;
  name: string;
  description: string;
  descriptionZh: string | null;
  type: ToolType;
  status: ToolStatus;
  repoUrl: string;
  homepageUrl: string | null;
  npmPackage: string | null;
  pypiPackage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  license: string | null;
  lastCommitAt: Date | null;
  author: string | null;
  version: string | null;
  tags: string[];
  transports: string[];
  isFeatured: boolean;
  featuresZh: string[];
  featuresEn: string[];
  installGuide: Record<string, unknown> | null;
  screenshots: string[];
  avgRating: number;
  ratingCount: number;
  categories: string[];
  platforms: string[];
}

const TOOLS: ToolSeed[] = [
  {
    slug: 'filesystem-mcp', name: 'Filesystem MCP Server',
    description: 'Secure file system operations with configurable access controls for AI agents.',
    descriptionZh: '为 AI Agent 提供安全的文件系统操作，支持可配置的访问控制。',
    type: ToolType.MCP_SERVER, status: ToolStatus.FEATURED,
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    homepageUrl: null, npmPackage: '@modelcontextprotocol/server-filesystem', pypiPackage: null,
    stars: 83090, forks: 12000, openIssues: 156, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-28T00:00:00Z'), author: 'Anthropic', version: '1.0.0',
    tags: ['filesystem', 'files', 'security', 'core'], transports: ['stdio'],
    isFeatured: true,
    featuresZh: ['安全的文件读写操作', '目录浏览和搜索', '可配置的访问权限控制', '支持批量操作'],
    featuresEn: ['Secure file read/write operations', 'Directory browsing and search', 'Configurable access controls', 'Batch operations support'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/dir', targetFile: null, config: null, copyText: 'claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/dir', verified: true },
      'cursor': { method: 'config', command: null, targetFile: '.cursor/mcp.json', config: { mcpServers: { filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'] } } }, copyText: '{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]\n    }\n  }\n}', verified: true },
      'cline': { method: 'config', command: null, targetFile: '.vscode/mcp.json', config: { mcpServers: { filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'] } } }, copyText: '{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]\n    }\n  }\n}', verified: true },
    },
    screenshots: [],
    avgRating: 4.8, ratingCount: 342,
    categories: ['filesystem'],
    platforms: ['claude-code', 'cursor', 'cline', 'windsurf', 'vscode'],
  },
  {
    slug: 'brave-search-mcp', name: 'Brave Search MCP Server',
    description: 'Web and local search using Brave Search API for AI agents.',
    descriptionZh: '使用 Brave Search API 为 AI Agent 提供网页和本地搜索能力。',
    type: ToolType.MCP_SERVER, status: ToolStatus.FEATURED,
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    homepageUrl: null, npmPackage: '@modelcontextprotocol/server-brave-search', pypiPackage: null,
    stars: 83090, forks: 12000, openIssues: 89, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-25T00:00:00Z'), author: 'Anthropic', version: '1.0.0',
    tags: ['search', 'web', 'brave', 'api'], transports: ['stdio'],
    isFeatured: true,
    featuresZh: ['网页搜索', '本地搜索', '可配置的结果数量', '支持搜索过滤'],
    featuresEn: ['Web search', 'Local search', 'Configurable result count', 'Search filtering support'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add brave-search -e BRAVE_API_KEY=your-key -- npx -y @modelcontextprotocol/server-brave-search', targetFile: null, config: null, copyText: 'claude mcp add brave-search -e BRAVE_API_KEY=your-key -- npx -y @modelcontextprotocol/server-brave-search', verified: true },
      'cursor': { method: 'config', command: null, targetFile: '.cursor/mcp.json', config: { mcpServers: { 'brave-search': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: 'your-key' } } } }, copyText: '{\n  "mcpServers": {\n    "brave-search": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-brave-search"],\n      "env": { "BRAVE_API_KEY": "your-key" }\n    }\n  }\n}', verified: true },
    },
    screenshots: [],
    avgRating: 4.6, ratingCount: 256,
    categories: ['search'],
    platforms: ['claude-code', 'cursor', 'cline', 'vscode'],
  },
  {
    slug: 'github-mcp', name: 'GitHub MCP Server',
    description: 'Comprehensive GitHub integration for repository management, issues, PRs, and more.',
    descriptionZh: '全面的 GitHub 集成，支持仓库管理、Issue、PR 等。',
    type: ToolType.MCP_SERVER, status: ToolStatus.FEATURED,
    repoUrl: 'https://github.com/github/github-mcp-server',
    homepageUrl: null, npmPackage: null, pypiPackage: null,
    stars: 15200, forks: 2100, openIssues: 67, language: 'Go', license: 'MIT',
    lastCommitAt: new Date('2026-04-01T00:00:00Z'), author: 'GitHub', version: '0.2.1',
    tags: ['github', 'git', 'repository', 'issues', 'pull-requests'], transports: ['stdio', 'sse'],
    isFeatured: true,
    featuresZh: ['仓库管理', 'Issue 和 PR 操作', '代码搜索', 'GitHub Actions 集成', 'Gist 管理'],
    featuresEn: ['Repository management', 'Issue and PR operations', 'Code search', 'GitHub Actions integration', 'Gist management'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=your-token -- npx -y @modelcontextprotocol/server-github', targetFile: null, config: null, copyText: 'claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=your-token -- npx -y @modelcontextprotocol/server-github', verified: true },
      'cursor': { method: 'config', command: null, targetFile: '.cursor/mcp.json', config: { mcpServers: { github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'your-token' } } } }, copyText: '{\n  "mcpServers": {\n    "github": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-github"],\n      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token" }\n    }\n  }\n}', verified: true },
    },
    screenshots: [],
    avgRating: 4.7, ratingCount: 189,
    categories: ['development'],
    platforms: ['claude-code', 'cursor', 'cline', 'windsurf', 'vscode'],
  },
  {
    slug: 'postgres-mcp', name: 'PostgreSQL MCP Server',
    description: 'Direct PostgreSQL database access with query execution and schema inspection.',
    descriptionZh: '直接访问 PostgreSQL 数据库，支持查询执行和模式检查。',
    type: ToolType.MCP_SERVER, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    homepageUrl: null, npmPackage: '@modelcontextprotocol/server-postgres', pypiPackage: null,
    stars: 83090, forks: 12000, openIssues: 45, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-20T00:00:00Z'), author: 'Anthropic', version: '1.0.0',
    tags: ['postgres', 'database', 'sql', 'query'], transports: ['stdio'],
    isFeatured: true,
    featuresZh: ['执行 SQL 查询', '数据库模式检查', '表结构浏览', '安全连接'],
    featuresEn: ['Execute SQL queries', 'Schema inspection', 'Table structure browsing', 'Secure connections'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost:5432/dbname', targetFile: null, config: null, copyText: 'claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost:5432/dbname', verified: true },
    },
    screenshots: [],
    avgRating: 4.5, ratingCount: 178,
    categories: ['database'],
    platforms: ['claude-code', 'cursor', 'cline', 'vscode'],
  },
  {
    slug: 'context7-mcp', name: 'Context7 MCP Server',
    description: 'Fetch up-to-date documentation and code examples for any library in real-time.',
    descriptionZh: '实时获取任何编程库的最新文档和代码示例。',
    type: ToolType.MCP_SERVER, status: ToolStatus.FEATURED,
    repoUrl: 'https://github.com/upstash/context7',
    homepageUrl: 'https://context7.com', npmPackage: '@upstash/context7-mcp', pypiPackage: null,
    stars: 12400, forks: 620, openIssues: 23, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-30T00:00:00Z'), author: 'Upstash', version: '1.2.0',
    tags: ['documentation', 'docs', 'lookup', 'library'], transports: ['stdio'],
    isFeatured: true,
    featuresZh: ['实时文档查询', '代码示例获取', '多语言支持', '版本感知'],
    featuresEn: ['Real-time documentation lookup', 'Code example fetching', 'Multi-language support', 'Version-aware queries'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add context7 -- npx -y @upstash/context7-mcp', targetFile: null, config: null, copyText: 'claude mcp add context7 -- npx -y @upstash/context7-mcp', verified: true },
      'cursor': { method: 'config', command: null, targetFile: '.cursor/mcp.json', config: { mcpServers: { context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] } } }, copyText: '{\n  "mcpServers": {\n    "context7": {\n      "command": "npx",\n      "args": ["-y", "@upstash/context7-mcp"]\n    }\n  }\n}', verified: true },
    },
    screenshots: [],
    avgRating: 4.9, ratingCount: 423,
    categories: ['development'],
    platforms: ['claude-code', 'cursor', 'cline', 'windsurf', 'vscode'],
  },
  {
    slug: 'everything-claude-code', name: 'Everything Claude Code (ECC)',
    description: 'The largest collection of Claude Code skills, agents, commands, and rules — 854+ skills, 195 agents.',
    descriptionZh: '最大的 Claude Code 技能集合 — 854+ 个 Skill、195 个 Agent、359 个命令。',
    type: ToolType.SKILL, status: ToolStatus.FEATURED,
    repoUrl: 'https://github.com/affaan-m/everything-claude-code',
    homepageUrl: null, npmPackage: null, pypiPackage: null,
    stars: 142429, forks: 21648, openIssues: 234, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-04-02T00:00:00Z'), author: 'Affaan M', version: null,
    tags: ['claude-code', 'skills', 'agents', 'commands', 'rules', 'collection'],
    transports: [],
    isFeatured: true,
    featuresZh: ['854+ Skills 收录', '195 个 Agent', '359 个 Slash Commands', '覆盖 12+ 编程语言', '通过 MCP 集成'],
    featuresEn: ['854+ Skills collection', '195 Agents', '359 Slash Commands', 'Covers 12+ languages', 'MCP integration'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add everything-claude-code -- npx -y everything-claude-code', targetFile: null, config: null, copyText: 'claude mcp add everything-claude-code -- npx -y everything-claude-code', verified: true },
    },
    screenshots: [],
    avgRating: 4.7, ratingCount: 567,
    categories: ['development'],
    platforms: ['claude-code'],
  },
  {
    slug: 'sequential-thinking-mcp', name: 'Sequential Thinking MCP',
    description: 'Dynamic and reflective problem-solving through structured chain-of-thought reasoning.',
    descriptionZh: '通过结构化的思维链推理实现动态、反思性问题解决。',
    type: ToolType.MCP_SERVER, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    homepageUrl: null, npmPackage: '@modelcontextprotocol/server-sequential-thinking', pypiPackage: null,
    stars: 83090, forks: 12000, openIssues: 12, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-15T00:00:00Z'), author: 'Anthropic', version: '1.0.0',
    tags: ['thinking', 'reasoning', 'problem-solving', 'chain-of-thought'], transports: ['stdio'],
    isFeatured: false,
    featuresZh: ['结构化思维链', '动态调整推理步骤', '分支和回溯', '假设验证'],
    featuresEn: ['Structured chain-of-thought', 'Dynamic step adjustment', 'Branching and backtracking', 'Hypothesis verification'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking', targetFile: null, config: null, copyText: 'claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking', verified: true },
    },
    screenshots: [],
    avgRating: 4.4, ratingCount: 89,
    categories: ['ai-ml'],
    platforms: ['claude-code', 'cursor', 'cline'],
  },
  {
    slug: 'slack-mcp', name: 'Slack MCP Server',
    description: 'Send messages, read channels, and manage Slack workspaces through MCP.',
    descriptionZh: '通过 MCP 发送消息、读取频道、管理 Slack 工作区。',
    type: ToolType.MCP_SERVER, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    homepageUrl: null, npmPackage: '@modelcontextprotocol/server-slack', pypiPackage: null,
    stars: 83090, forks: 12000, openIssues: 34, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-18T00:00:00Z'), author: 'Anthropic', version: '1.0.0',
    tags: ['slack', 'messaging', 'communication', 'channels'], transports: ['stdio'],
    isFeatured: false,
    featuresZh: ['发送和读取消息', '频道管理', '文件上传', '用户信息查询'],
    featuresEn: ['Send and read messages', 'Channel management', 'File uploads', 'User info lookup'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add slack -e SLACK_BOT_TOKEN=xoxb-your-token -- npx -y @modelcontextprotocol/server-slack', targetFile: null, config: null, copyText: 'claude mcp add slack -e SLACK_BOT_TOKEN=xoxb-your-token -- npx -y @modelcontextprotocol/server-slack', verified: true },
    },
    screenshots: [],
    avgRating: 4.3, ratingCount: 112,
    categories: ['communication'],
    platforms: ['claude-code', 'cursor', 'cline'],
  },
  {
    slug: 'openclaw-browser', name: 'OpenClaw Browser Control',
    description: 'Built-in browser automation skill for OpenClaw agents with tab management and navigation.',
    descriptionZh: 'OpenClaw 内置浏览器自动化技能，支持标签页管理和页面导航。',
    type: ToolType.SKILL, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/openclaw/openclaw',
    homepageUrl: 'https://openclaw.design', npmPackage: null, pypiPackage: null,
    stars: 8200, forks: 1100, openIssues: 45, language: 'Python', license: 'Apache-2.0',
    lastCommitAt: new Date('2026-03-28T00:00:00Z'), author: 'OpenClaw', version: '1.3.0',
    tags: ['browser', 'automation', 'web', 'scraping'], transports: [],
    isFeatured: false,
    featuresZh: ['浏览器自动化', '标签页管理', '截图和页面导航', '表单填写'],
    featuresEn: ['Browser automation', 'Tab management', 'Screenshots and navigation', 'Form filling'],
    installGuide: {},
    screenshots: [],
    avgRating: 4.5, ratingCount: 78,
    categories: ['productivity'],
    platforms: ['openclaw'],
  },
  {
    slug: 'cloudflare-mcp', name: 'Cloudflare MCP Server',
    description: 'Manage Cloudflare Workers, KV, D1, R2, and more through MCP.',
    descriptionZh: '通过 MCP 管理 Cloudflare Workers、KV、D1、R2 等服务。',
    type: ToolType.MCP_SERVER, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/cloudflare/mcp-server-cloudflare',
    homepageUrl: null, npmPackage: '@cloudflare/mcp-server-cloudflare', pypiPackage: null,
    stars: 5600, forks: 420, openIssues: 18, language: 'TypeScript', license: 'Apache-2.0',
    lastCommitAt: new Date('2026-03-22T00:00:00Z'), author: 'Cloudflare', version: '0.8.0',
    tags: ['cloudflare', 'workers', 'kv', 'd1', 'cloud'], transports: ['stdio'],
    isFeatured: false,
    featuresZh: ['Workers 管理', 'KV 存储操作', 'D1 数据库管理', 'R2 对象存储'],
    featuresEn: ['Workers management', 'KV store operations', 'D1 database management', 'R2 object storage'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add cloudflare -- npx -y @cloudflare/mcp-server-cloudflare', targetFile: null, config: null, copyText: 'claude mcp add cloudflare -- npx -y @cloudflare/mcp-server-cloudflare', verified: true },
    },
    screenshots: [],
    avgRating: 4.2, ratingCount: 67,
    categories: ['cloud'],
    platforms: ['claude-code', 'cursor', 'cline'],
  },
  {
    slug: 'memory-mcp', name: 'Knowledge Graph Memory MCP',
    description: 'Persistent knowledge graph for AI agents to store and recall information across sessions.',
    descriptionZh: '为 AI Agent 提供持久化知识图谱，支持跨会话存储和回忆信息。',
    type: ToolType.MCP_SERVER, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    homepageUrl: null, npmPackage: '@modelcontextprotocol/server-memory', pypiPackage: null,
    stars: 83090, forks: 12000, openIssues: 28, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-10T00:00:00Z'), author: 'Anthropic', version: '1.0.0',
    tags: ['memory', 'knowledge-graph', 'persistence', 'storage'], transports: ['stdio'],
    isFeatured: false,
    featuresZh: ['知识图谱存储', '实体关系管理', '跨会话持久化', '语义搜索'],
    featuresEn: ['Knowledge graph storage', 'Entity-relation management', 'Cross-session persistence', 'Semantic search'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add memory -- npx -y @modelcontextprotocol/server-memory', targetFile: null, config: null, copyText: 'claude mcp add memory -- npx -y @modelcontextprotocol/server-memory', verified: true },
    },
    screenshots: [],
    avgRating: 4.6, ratingCount: 203,
    categories: ['ai-ml'],
    platforms: ['claude-code', 'cursor', 'cline'],
  },
  {
    slug: 'playwright-mcp', name: 'Playwright MCP Server',
    description: 'Browser automation through Playwright with screenshot, click, and navigation support.',
    descriptionZh: '通过 Playwright 实现浏览器自动化，支持截图、点击和导航。',
    type: ToolType.MCP_SERVER, status: ToolStatus.ACTIVE,
    repoUrl: 'https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-playwright',
    homepageUrl: null, npmPackage: '@anthropic-ai/mcp-playwright', pypiPackage: null,
    stars: 3800, forks: 340, openIssues: 15, language: 'TypeScript', license: 'MIT',
    lastCommitAt: new Date('2026-03-25T00:00:00Z'), author: 'Anthropic', version: '0.2.0',
    tags: ['playwright', 'browser', 'automation', 'testing', 'e2e'], transports: ['stdio'],
    isFeatured: false,
    featuresZh: ['浏览器自动化', '截图功能', '页面交互', 'E2E 测试'],
    featuresEn: ['Browser automation', 'Screenshot support', 'Page interaction', 'E2E testing'],
    installGuide: {
      'claude-code': { method: 'cli', command: 'claude mcp add playwright -- npx -y @anthropic-ai/mcp-playwright', targetFile: null, config: null, copyText: 'claude mcp add playwright -- npx -y @anthropic-ai/mcp-playwright', verified: true },
    },
    screenshots: [],
    avgRating: 4.3, ratingCount: 95,
    categories: ['productivity'],
    platforms: ['claude-code', 'cursor'],
  },
];

export async function seedMain() {
  console.log('Seeding platforms...');
  for (const platform of PLATFORMS) {
    await prisma.platform.upsert({
      where: { slug: platform.slug },
      update: { name: platform.name, icon: platform.icon, configKey: platform.configKey },
      create: platform,
    });
  }

  console.log('Seeding categories...');
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        nameEn: category.nameEn,
        nameZh: category.nameZh,
        icon: category.icon,
        descriptionEn: category.descriptionEn,
        descriptionZh: category.descriptionZh,
        order: category.order,
      },
      create: category,
    });
  }

  console.log('Seeding tools...');
  for (const tool of TOOLS) {
    const { categories: categorySlugs, platforms: platformSlugs, ...toolFields } = tool;

    // Upsert the tool itself
    const createdTool = await prisma.tool.upsert({
      where: { slug: tool.slug },
      update: {
        name: toolFields.name,
        description: toolFields.description,
        descriptionZh: toolFields.descriptionZh,
        type: toolFields.type,
        status: toolFields.status,
        repoUrl: toolFields.repoUrl,
        homepageUrl: toolFields.homepageUrl,
        npmPackage: toolFields.npmPackage,
        pypiPackage: toolFields.pypiPackage,
        stars: toolFields.stars,
        forks: toolFields.forks,
        openIssues: toolFields.openIssues,
        language: toolFields.language,
        license: toolFields.license,
        lastCommitAt: toolFields.lastCommitAt,
        author: toolFields.author,
        version: toolFields.version,
        tags: toolFields.tags,
        transports: toolFields.transports,
        isFeatured: toolFields.isFeatured,
        featuresZh: toolFields.featuresZh,
        featuresEn: toolFields.featuresEn,
        installGuide: toolFields.installGuide as any,
        screenshots: toolFields.screenshots,
        avgRating: toolFields.avgRating,
        ratingCount: toolFields.ratingCount,
      },
      create: {
        slug: toolFields.slug,
        name: toolFields.name,
        description: toolFields.description,
        descriptionZh: toolFields.descriptionZh,
        type: toolFields.type,
        status: toolFields.status,
        repoUrl: toolFields.repoUrl,
        homepageUrl: toolFields.homepageUrl,
        npmPackage: toolFields.npmPackage,
        pypiPackage: toolFields.pypiPackage,
        stars: toolFields.stars,
        forks: toolFields.forks,
        openIssues: toolFields.openIssues,
        language: toolFields.language,
        license: toolFields.license,
        lastCommitAt: toolFields.lastCommitAt,
        author: toolFields.author,
        version: toolFields.version,
        tags: toolFields.tags,
        transports: toolFields.transports,
        isFeatured: toolFields.isFeatured,
        featuresZh: toolFields.featuresZh,
        featuresEn: toolFields.featuresEn,
        installGuide: toolFields.installGuide as any,
        screenshots: toolFields.screenshots,
        avgRating: toolFields.avgRating,
        ratingCount: toolFields.ratingCount,
      },
    });

    // Connect categories
    for (const catSlug of categorySlugs) {
      const category = await prisma.category.findUnique({ where: { slug: catSlug } });
      if (category) {
        await prisma.toolCategory.upsert({
          where: { toolId_categoryId: { toolId: createdTool.id, categoryId: category.id } },
          update: {},
          create: { toolId: createdTool.id, categoryId: category.id },
        });
      }
    }

    // Connect platforms
    for (const platSlug of platformSlugs) {
      const platform = await prisma.platform.findUnique({ where: { slug: platSlug } });
      if (platform) {
        await prisma.toolPlatform.upsert({
          where: { toolId_platformId: { toolId: createdTool.id, platformId: platform.id } },
          update: {},
          create: { toolId: createdTool.id, platformId: platform.id },
        });
      }
    }
  }

  const [platformCount, categoryCount, toolCount] = await Promise.all([
    prisma.platform.count(),
    prisma.category.count(),
    prisma.tool.count(),
  ]);

  console.log(`Seeding complete. Created ${toolCount} tools, ${categoryCount} categories, ${platformCount} platforms.`);
}

// Only auto-execute when run directly (not when imported for testing)
if (require.main === module) {
  seedMain()
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
