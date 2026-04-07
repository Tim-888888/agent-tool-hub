# AgentToolHub — 技术架构文档

## 1. 技术选型

### 1.1 前端

| 技术 | 选择 | 理由 |
|------|------|------|
| 框架 | **Next.js 15** (App Router) | SSR/SSG + SEO 优化 + React 生态 |
| 样式 | **Tailwind CSS 4** | 快速开发 + iOS 风格实现 |
| 语言 | **TypeScript** | 类型安全 |
| 动画 | **Framer Motion** | 页面过渡和微交互 |
| 图标 | **Lucide React** | 简洁风格一致 |
| 搜索 | **FlexSearch** (客户端) → 后期 Algolia | MVP 阶段够用 |

### 1.2 后端 & 数据

| 技术 | 选择 | 理由 |
|------|------|------|
| API | **Next.js API Routes** | 全栈统一，部署简单 |
| 数据库 | **PostgreSQL** (Supabase) | 免费额度 + 全文搜索 + JSON 支持 |
| ORM | **Prisma** | 类型安全 + 迁移管理 |
| 缓存 | **Next.js ISR + SWR** | 静态页面 + 客户端缓存 |

### 1.3 数据采集

| 来源 | 方式 | 数据 |
|------|------|------|
| GitHub API | REST + GraphQL | star、fork、issue、README、语言、贡献者 |
| npm Registry | REST API | 下载量、版本 |
| PyPI | JSON API | 下载量、版本 |
| 现有目录 | API/爬取 | 标签、分类、基础描述 |
| everything-claude-code | GitHub Repo | Skill 列表和元数据 |

### 1.4 部署

| 平台 | 选择 | 理由 |
|------|------|------|
| 托管 | **Vercel** | Next.js 原生优化，免费额度 |
| 数据库 | **Supabase** | 免费额度够 MVP |
| 域名 | 待定 | - |
| CI/CD | GitHub Actions | 自动化测试和部署 |

## 2. 数据模型

### 2.1 核心表结构

```prisma
// 工具主表
model Tool {
  id            String       @id @default(cuid())
  slug          String       @unique
  name          String
  description   String       // 英文描述
  descriptionZh String?      // 中文描述（精选）
  type          ToolType     // MCP_SERVER, SKILL, RULE
  status        ToolStatus   // PENDING, ACTIVE, FEATURED, ARCHIVED

  // 来源信息
  repoUrl       String       // GitHub 仓库 URL
  homepageUrl   String?
  npmPackage    String?
  pypiPackage   String?

  // GitHub 指标
  stars         Int          @default(0)
  forks         Int          @default(0)
  openIssues    Int          @default(0)
  language      String?
  license       String?
  lastCommitAt  DateTime?

  // 元数据
  author        String?
  version       String?
  tags          String[]     // 标签数组
  categories    Category[]   // 多对多
  platforms     Platform[]   // 支持的平台，多对多
  transports    String[]     // MCP 传输协议: stdio, sse, streamable-http

  // 精选内容
  isFeatured    Boolean      @default(false)
  featuresZh    String[]     // 中文功能亮点
  featuresEn    String[]     // 英文功能亮点
  installGuide  Json?        // 各平台安装配置 JSON
  screenshots   String[]     // 截图 URL

  // 评分
  avgRating     Float        @default(0)
  ratingCount   Int          @default(0)

  // 时间
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  // 关联
  reviews       Review[]
  submissions   Submission[]

  @@index([type, status])
  @@index([stars])
  @@index([lastCommitAt])
  @@index([tags])
}

enum ToolType {
  MCP_SERVER
  SKILL
  RULE
}

enum ToolStatus {
  PENDING
  ACTIVE
  FEATURED
  ARCHIVED
}

// 分类
model Category {
  id          String   @id @default(cuid())
  slug        String   @unique
  nameEn      String
  nameZh      String
  icon        String   // Lucide 图标名
  tools       Tool[]
  order       Int      @default(0)
}

// 平台
model Platform {
  id          String   @id @default(cuid())
  slug        String   @unique  // claude-code, cursor, cline, openclaw, windsurf
  name        String
  icon        String
  configKey   String   // 安装配置的 key
  tools       Tool[]
}

// 用户评价
model Review {
  id          String   @id @default(cuid())
  toolId      String
  tool        Tool     @relation(fields: [toolId], references: [id])
  rating      Int      // 1-5
  content     String?
  platform    String?  // 使用的 Agent 平台
  useCase     String?  // 使用场景
  createdAt   DateTime @default(now())
}

// 工具提交
model Submission {
  id          String   @id @default(cuid())
  toolId      String?
  tool        Tool?    @relation(fields: [toolId], references: [id])
  repoUrl     String
  submitterEmail String?
  notes       String?
  status      SubmissionStatus @default(PENDING)
  createdAt   DateTime @default(now())
  reviewedAt  DateTime?
}

enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 2.2 安装指引 JSON 结构

```json
{
  "claude-code": {
    "method": "cli",
    "command": "claude mcp add tool-name -- npx @scope/package",
    "config": null,
    "targetFile": null,
    "copyText": "claude mcp add tool-name -- npx @scope/package"
  },
  "cursor": {
    "method": "config",
    "command": null,
    "targetFile": ".cursor/mcp.json",
    "config": {
      "mcpServers": {
        "tool-name": {
          "command": "npx",
          "args": ["-y", "@scope/package"]
        }
      }
    },
    "copyText": "// Add to .cursor/mcp.json\n{...}"
  },
  "cline": {
    "method": "config",
    "command": null,
    "targetFile": ".vscode/mcp.json",
    "config": { "..." : "..." },
    "copyText": "// Add to .vscode/mcp.json\n{...}"
  }
}
```

### 2.3 Agent 可读安装信息（JSON-LD）

每个工具详情页在 `<head>` 中嵌入 JSON-LD，供 AI Agent 直接解析执行：

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "tool-name",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "installInstructions": [
    {
      "platform": "claude-code",
      "method": "cli",
      "command": "claude mcp add tool-name -- npx @scope/package",
      "verified": true
    },
    {
      "platform": "cursor",
      "method": "config",
      "targetFile": ".cursor/mcp.json",
      "config": {
        "mcpServers": {
          "tool-name": { "command": "npx", "args": ["-y", "@scope/package"] }
        }
      },
      "verified": true
    }
  ],
  "requirements": ["Node.js >= 18"],
  "homepage": "https://github.com/owner/repo"
}
```

同时在页面 HTML 中嵌入注释标记的纯文本版本，确保 Agent 无论用何种方式读取都能获取安装指令：

```html
<!-- agent-install-start -->
<!-- [Agent Install Instructions for tool-name] -->
<!-- claude-code: claude mcp add tool-name -- npx @scope/package -->
<!-- cursor: .cursor/mcp.json -> {"mcpServers":{"tool-name":{"command":"npx","args":["-y","@scope/package"]}}} -->
<!-- cline: .vscode/mcp.json -> {"mcpServers":{"tool-name":{"command":"npx","args":["-y","@scope/package"]}}} -->
<!-- agent-install-end -->
```

前端组件 `AgentInstallSection.tsx` 负责：
1. 渲染 JSON-LD 到 `<head>`
2. 渲染注释标记的纯文本版本
3. 在页面上以标签页形式展示人类可读的安装指引

## 3. 项目结构

```
agent-tool-hub/
├── docs/                          # 产品和技术文档
│   ├── PRD.md
│   └── TECHNICAL_DESIGN.md
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── [locale]/              # 国际化路由
│   │   │   ├── page.tsx           # 首页
│   │   │   ├── tools/
│   │   │   │   ├── page.tsx       # 工具列表
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx   # 工具详情
│   │   │   ├── categories/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx   # 分类页
│   │   │   ├── rankings/
│   │   │   │   └── page.tsx       # 排行榜
│   │   │   ├── submit/
│   │   │   │   └── page.tsx       # 提交工具
│   │   │   └── about/
│   │   │       └── page.tsx       # 关于页
│   │   ├── api/
│   │   │   ├── tools/             # 工具 CRUD API
│   │   │   ├── search/            # 搜索 API
│   │   │   ├── sync/              # 数据同步 API
│   │   │   └── submit/            # 工具提交 API
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # 基础 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── PlatformIcons.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── LocaleSwitcher.tsx
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturedTools.tsx
│   │   │   ├── TrendingTools.tsx
│   │   │   └── CategoryGrid.tsx
│   │   ├── tools/
│   │   │   ├── ToolCard.tsx
│   │   │   ├── ToolGrid.tsx
│   │   │   ├── ToolDetail.tsx
│   │   │   ├── CompatibilityMatrix.tsx
│   │   │   ├── InstallGuide.tsx
│   │   │   └── ReviewSection.tsx
│   │   └── shared/
│   │       ├── CopyButton.tsx
│   │       ├── StarRating.tsx
│   │       └── PlatformBadge.tsx
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   ├── github.ts              # GitHub API 封装
│   │   ├── sync.ts                # 数据同步逻辑
│   │   ├── scoring.ts             # 工具评分算法
│   │   ├── search.ts              # 搜索索引
│   │   └── utils.ts               # 工具函数
│   ├── i18n/
│   │   ├── config.ts              # 国际化配置
│   │   ├── zh.json                # 中文翻译
│   │   └── en.json                # 英文翻译
│   └── types/
│       └── index.ts               # TypeScript 类型定义
├── prisma/
│   ├── schema.prisma              # 数据模型
│   ├── seed.ts                    # 种子数据
│   └── migrations/                # 数据库迁移
├── scripts/
│   ├── sync-tools.ts              # 工具同步脚本
│   ├── sync-skills.ts             # Skill 同步脚本
│   └── seed-featured.ts           # 精选数据导入
├── public/
│   └── images/                    # 静态资源
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## 4. API 设计

### 4.1 工具 API

```
GET    /api/tools              # 列表（分页、过滤、排序）
GET    /api/tools/[slug]       # 详情
GET    /api/tools/search       # 搜索（q, type, platform, category, sort）
GET    /api/tools/trending     # 热门工具
GET    /api/tools/newest       # 最新收录
POST   /api/tools/submit       # 提交新工具
```

### 4.2 分类 API

```
GET    /api/categories          # 所有分类
GET    /api/categories/[slug]   # 分类详情 + 关联工具
```

### 4.3 评价 API

```
GET    /api/tools/[slug]/reviews   # 工具评价列表
POST   /api/tools/[slug]/reviews   # 提交评价
```

### 4.4 同步 API

```
POST   /api/sync/github          # 触发 GitHub 数据同步
POST   /api/sync/npm             # 触发 npm 数据同步
```

## 5. 数据同步策略

### 5.1 初始数据导入

1. **MCP Server 数据**：
   - 从 GitHub 搜索 `topic:mcp-server` + `topic:mcp` 获取仓库列表
   - 从 npm 搜索 `mcp-server-*` 和 `@modelcontextprotocol/*`
   - 从 awesome-mcp-servers 列表获取精选
   - 合并去重

2. **Skill 数据**：
   - 从 GitHub 搜索 `topic:claude-code-skill`、`topic:claude-code-command`、`topic:agent-skill` 等关键词发现 Skill 仓库
   - 从 GitHub 搜索 `.claude/commands/` 目录下的 `.md` 文件（Claude Code Slash Commands）
   - 搜索 `filename:SKILL.md`、`filename:skill.md` 发现声明式 Skill
   - 从 everything-claude-code 仓库解析 skill 元数据
   - 从 OpenClaw ClawHub 获取 skill 列表
   - 合并去重

3. **质量筛选**：
   - 综合评分 = star * 0.3 + 活跃度 * 0.25 + 贡献者 * 0.2 + 文档完整度 * 0.15 + 用户评价 * 0.1
   - Top 200-300 标记为 FEATURED

### 5.2 定期更新

- GitHub 指标：每 6 小时更新一次 star/fork/issue
- 新仓库发现：每日扫描
- npm 下载量：每日更新
- 社区提交：实时

## 6. SEO 策略

### 6.1 页面优化

- 每个工具独立 SSG 页面
- 动态生成 `<title>`、`<meta description>`、Open Graph
- 结构化数据（JSON-LD SoftwareApplication schema）
- 自动生成 Sitemap

### 6.2 URL 结构

```
/en/tools/brave-search-mcp          # 英文详情
/zh/tools/brave-search-mcp          # 中文详情
/en/tools?type=mcp&platform=cursor  # 过滤（英文）
/en/categories/database             # 分类（英文）
```

### 6.3 关键词策略

- 英文：`best MCP servers`, `Claude Code skills`, `Cursor MCP tools`
- 中文：`MCP 服务器推荐`, `Claude Code 技能`, `Cursor MCP 工具`

## 7. 设计系统

### 7.1 色彩

```css
:root {
  /* 浅色主题 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f7;
  --bg-tertiary: #e8e8ed;
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --accent: #0071e3;
  --accent-hover: #0077ed;
  --border: rgba(0, 0, 0, 0.08);

  /* 深色主题 */
  --bg-primary-dark: #000000;
  --bg-secondary-dark: #1c1c1e;
  --bg-tertiary-dark: #2c2c2e;
  --text-primary-dark: #f5f5f7;
  --text-secondary-dark: #98989d;
  --accent-dark: #2997ff;

  /* 语义色 */
  --success: #30d158;
  --warning: #ff9f0a;
  --danger: #ff453a;
  --info: #64d2ff;

  /* 平台品牌色 */
  --claude: #d97757;
  --cursor: #7c3aed;
  --cline: #f97316;
  --openclaw: #22c55e;
  --windsurf: #06b6d4;
  --vscode: #007acc;
  --chatgpt: #10a37f;
}

/* 类型标签色 */
--color-mcp: #3b82f6;
--color-skill: #8b5cf6;
--color-rule: #f59e0b;
```

### 7.2 圆角

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
```

### 7.3 字体

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter',
  'Noto Sans SC', sans-serif;
--font-mono: 'SF Mono', 'Fira Code', monospace;
```

### 7.4 阴影

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
```

## 8. 开发计划

### Phase 1：基础框架（1-2 天）

- Next.js 项目初始化
- Tailwind + 设计系统配置
- Prisma + Supabase 数据库配置
- 基础 Layout（Header/Footer/LocaleSwitcher）

### Phase 2：数据层（1-2 天）

- Prisma schema 和迁移
- 数据同步脚本（GitHub/npm）
- 种子数据导入
- 评分算法实现

### Phase 3：核心页面（2-3 天）

- 首页（Hero + 精选 + 分类）
- 工具列表页（搜索 + 过滤 + 排序）
- 工具详情页（基础信息 + 精选信息）
- 分类页

### Phase 4：功能完善（1-2 天）

- 跨平台筛选
- 安装指引 + 一键复制
- 排行榜
- 工具提交表单

### Phase 5：打磨上线（1 天）

- 响应式适配
- SEO 优化（meta, sitemap, robots）
- 性能优化
- 部署到 Vercel
