# AgentToolHub — 产品需求文档 (PRD)

> 全平台 AI 工具发现引擎 — 收录所有 Skill 和 MCP，标注跨平台兼容性

## 1. 产品概述

### 1.1 定位

AgentToolHub 是一个面向 AI Agent 开发者的工具发现平台，收录各主流 Agent 平台（Claude Code、Cursor、Cline、OpenClaw、Windsurf 等）的 Skill、MCP Server 和 Rule，提供跨平台搜索、对比和安装指引。

**核心差异化**：
- 跨平台覆盖（不只是 MCP，还包含 Skill 和 Rule）
- 跨 Agent 平台筛选
- 中英双语
- 精选产品页 + 安全/质量信号

### 1.2 目标用户

| 用户类型 | 需求 | 优先级 |
|----------|------|--------|
| AI Agent 开发者 | 快速找到适合自己平台的工具 | P0 |
| MCP/Skill 开发者 | 推广自己的工具，获取用户 | P1 |
| 技术决策者 | 评估和对比 AI Agent 工具生态 | P2 |

### 1.3 核心价值

1. **一站式发现**：不再需要在 GitHub、Reddit、Discord 之间跳转
2. **跨平台兼容性**：一眼看出工具支持哪些 Agent 平台
3. **质量信号**：多维评分帮助筛选高质量工具
4. **安装指引**：每个工具提供各平台的一键配置方法

## 2. 功能需求

### 2.1 模块一：发现与搜索

#### 2.1.1 搜索

- **全文搜索**：工具名称、描述、标签
- **搜索建议**：输入时自动补全热门工具
- **搜索过滤器**：
  - 工具类型：MCP Server / Skill / Rule
  - 目标平台：Claude Code / Cursor / Cline / OpenClaw / Windsurf / VS Code / ChatGPT
  - 分类：数据库 / 开发工具 / API 集成 / 文件系统 / 搜索 / 通信 / 数据分析 / 安全 / 媒体 / 生产力
  - 编程语言：Python / TypeScript / Go / Rust / Java / 其他
  - 传输协议（MCP）：stdio / SSE / Streamable HTTP
- **排序方式**：相关度 / Star 数 / 最近更新 / 下载量 / 评分

#### 2.1.2 分类浏览

- 主分类导航
- 二级标签系统
- 每个分类显示工具数量

#### 2.1.3 跨平台筛选

- 核心差异化功能
- 用户选择自己使用的平台，只看到兼容的工具
- 每个工具标注支持的平台（用图标 + 文字）

### 2.2 模块二：工具产品页

#### 2.2.1 基础信息（自动抓取）

| 字段 | 来源 |
|------|------|
| 名称 | GitHub/npm/PyPI |
| 一句话描述 | GitHub description / README 首段 |
| 作者/维护者 | GitHub owner |
| 仓库链接 | GitHub URL |
| 许可证 | GitHub license |
| Star / Fork / Issue 数 | GitHub API |
| 最近更新时间 | GitHub commits |
| 编程语言 | GitHub language |
| 标签 | 自动提取 + 人工标注 |

#### 2.2.2 精选信息（人工编写，Top 200-300）

| 字段 | 说明 |
|------|------|
| 中文描述 | 面向中文用户的详细说明 |
| 英文描述 | 面向英文用户的详细说明 |
| 功能亮点 | 3-5 个核心特性 |
| 使用场景 | 典型应用场景描述 |
| 安装指引 | 各平台的一键安装配置 |
| 兼容性矩阵 | 详细标注支持的平台和版本 |
| 截图/Demo | 工具效果展示 |
| 替代工具 | 功能类似的工具对比 |

#### 2.2.3 安装指引（核心体验）

每个工具提供各平台的一键安装配置：

```
# Claude Code
claude mcp add <tool-name> -- npx <package>

# Cursor
# .cursor/mcp.json
{
  "mcpServers": {
    "<tool-name>": {
      "command": "npx",
      "args": ["<package>"]
    }
  }
}

# Cline / VS Code
# .vscode/mcp.json
...
```

提供一键复制功能。

#### 2.2.4 Agent 可读安装信息（差异化功能）

在每个工具详情页底部嵌入一段结构化的 Agent 安装指引。当 AI Agent（Claude Code、Cursor Agent 等）浏览工具页面时，可以自动识别并执行安装命令。

**设计原理**：
- 使用 `<script type="application/ld+json">` 嵌入 JSON-LD 结构化数据
- 同时提供人类可读的纯文本版本（`<!-- agent-install-start -->` 注释标记区域）
- Agent 无需解析 HTML，直接读取 JSON-LD 即可获得完整安装信息

**JSON-LD 结构**：
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "tool-name",
  "applicationCategory": "DeveloperApplication",
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
      "config": { "mcpServers": { "tool-name": { "command": "npx", "args": ["-y", "@scope/package"] } } },
      "verified": true
    },
    {
      "platform": "cline",
      "method": "config",
      "targetFile": ".vscode/mcp.json",
      "config": { "mcpServers": { "tool-name": { "command": "npx", "args": ["-y", "@scope/package"] } } },
      "verified": true
    },
    {
      "platform": "windsurf",
      "method": "config",
      "targetFile": ".windsurf/mcp.json",
      "config": { "mcpServers": { "tool-name": { "command": "npx", "args": ["-y", "@scope/package"] } } },
      "verified": false
    }
  ],
  "requirements": ["Node.js >= 18", "npm"],
  "homepage": "https://github.com/owner/repo"
}
```

**人类可读的 Agent 指引区域**：
```html
<!-- agent-install-start -->
<!--
[Agent Install Instructions]
If you are an AI Agent reading this page, you can install this tool using:

## Claude Code
Run: claude mcp add tool-name -- npx @scope/package

## Cursor
Add to .cursor/mcp.json:
{"mcpServers":{"tool-name":{"command":"npx","args":["-y","@scope/package"]}}}

## Cline / VS Code
Add to .vscode/mcp.json:
{"mcpServers":{"tool-name":{"command":"npx","args":["-y","@scope/package"]}}}

## Windsurf
Add to .windsurf/mcp.json:
{"mcpServers":{"tool-name":{"command":"npx","args":["-y","@scope/package"]}}}

Prerequisites: Node.js >= 18, npm
Source: https://github.com/owner/repo
-->
<!-- agent-install-end -->
```

**视觉呈现**：
- 页面上以"Agent Install"标签页形式展示
- 深色代码块风格，标注各平台命令
- 用户也可手动复制使用

### 2.3 模块三：精选与排名

#### 2.3.1 首页精选

- **Hero 区域**：每周推荐 1-3 个精选工具
- **热门工具**：按周/月活跃度排名
- **新上线**：最近收录的工具
- **分类精选**：每个主要分类的 Top 工具

#### 2.3.2 排行榜

- **总榜**：综合评分（star + 活跃度 + 贡献者 + 用户评分）
- **周榜**：本周增长最快
- **新秀榜**：近 30 天新上线
- **分类榜**：按工具分类排名

#### 2.3.3 编辑推荐

- 人工精选的工具合集（如"数据库必备 MCP"、"前端开发 Skill 推荐"）
- 附带推荐理由

### 2.4 模块四：社区贡献

#### 2.4.1 工具提交

- GitHub 仓库 URL 提交
- 自动抓取基础信息
- 提交者可补充标签和描述
- 审核后发布（MVP 阶段人工审核）

#### 2.4.2 用户评价

- 五星评分
- 文字评价
- 标注使用的 Agent 平台
- 使用场景描述

#### 2.4.3 标签编辑

- 用户可建议新标签
- 投票机制确认标签

## 3. 非功能需求

### 3.1 性能

| 指标 | 目标 |
|------|------|
| LCP | < 2.5s |
| FCP | < 1.5s |
| CLS | < 0.1 |
| TTI | < 3s |
| 搜索响应 | < 300ms |

### 3.2 SEO

- 每个工具独立页面，URL 格式 `/tools/{slug}`
- 中英文独立 URL：`/zh/tools/{slug}` 和 `/en/tools/{slug}`
- 结构化数据（JSON-LD）
- Sitemap 自动生成
- Open Graph 元数据

### 3.3 国际化

- 中英双语
- URL 前缀区分语言
- 内容翻译（精选页人工翻译，基础页机器翻译 + 人工校正）

### 3.4 设计风格

- iOS 风格：简洁、圆角、毛玻璃效果
- 科技感：深色/浅色双主题
- 响应式：移动端优先
- 字体：SF Pro / Inter + 中文适配

## 4. 盈利路线图

### Phase 1（MVP，0-3 月）

- 完全免费
- 聚焦内容和 SEO
- 建立流量基础

### Phase 2（3-6 月）

- Pro 订阅（$5-9/月）：安全评分、深度对比、安装配置管理
- 开发者套餐（$29-49/月）：Featured Listing、流量分析

### Phase 3（6-12 月）

- 认证审核收费
- API 数据订阅
- Newsletter 赞助

## 5. MVP 范围与优先级

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | 工具列表页 | 分页、基础过滤、搜索 |
| P0 | 工具详情页 | 基础信息 + 精选产品页 |
| P0 | 跨平台筛选 | 核心差异化 |
| P0 | 分类浏览 | 按类型和标签浏览 |
| P0 | 首页精选 | Hero + 热门 + 新上线 |
| P1 | 搜索过滤 | 多维过滤器 |
| P1 | 排行榜 | 综合/周/新秀榜 |
| P1 | 安装指引 | 各平台一键配置 |
| P1 | 工具提交 | GitHub URL 提交 |
| P2 | 用户评价 | 评分 + 评论 |
| P2 | 编辑推荐 | 工具合集 |
| P2 | 标签编辑 | 社区标签 |

## 6. 页面清单

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 精选、分类导航、热门工具 |
| 工具列表 | `/tools` | 全部工具，搜索+筛选 |
| 工具详情 | `/tools/{slug}` | 单个工具的完整信息 |
| 分类页 | `/categories/{slug}` | 某分类下的工具 |
| 排行榜 | `/rankings` | 各类排行 |
| 提交工具 | `/submit` | 提交新工具 |
| 关于 | `/about` | 平台介绍 |
| 中英双语 | `/zh/*` `/en/*` | 语言切换 |
