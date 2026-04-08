# Phase 4: Community Features (Future) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 04-community-features-future
**Areas discussed:** 匿名 vs 认证, Review 体验设计, Tool Submission 审核流程, Tag Voting 系统

---

## 匿名 vs 认证

| Option | Description | Selected |
|--------|-------------|----------|
| 完全匿名 | 无需登录，rate limit + CAPTCHA 防垃圾 | |
| GitHub OAuth 登录 | 要求 GitHub 登录，可跟踪用户历史 | ✓ |
| 混合模式 | Review 匿名，Submission 需登录 | |

**User's choice:** GitHub OAuth 登录

| Option | Description | Selected |
|--------|-------------|----------|
| 只读基本信息 | GitHub username + avatar，最小权限 | ✓ |
| GitHub App 集成 | 更强权限但配置复杂 | |

**User's choice:** 只读基本信息

| Option | Description | Selected |
|--------|-------------|----------|
| NextAuth.js (Auth.js) | Next.js 生态主流认证库 | ✓ |
| 手写 OAuth 流程 | 轻量但需自己处理安全细节 | |

**User's choice:** NextAuth.js (Auth.js)

| Option | Description | Selected |
|--------|-------------|----------|
| 全部需要登录 | Review + Submission + Tag Voting 都需登录 | ✓ |
| Review 匿名 + Submission 需登录 | 降低 Review 门槛 | |

**User's choice:** 全部需要登录

---

## Review 体验设计

| Option | Description | Selected |
|--------|-------------|----------|
| 直接发布 | 提交后立即显示，无审核 | ✓ |
| 审核后发布 | 管理员审核后才显示 | |

**User's choice:** 直接发布

| Option | Description | Selected |
|--------|-------------|----------|
| 评分 + 可选评论 | 必填评分 + 可选文字/平台/用例 | ✓ |
| 评分 + 必填评论 | 提高评论质量但降低提交率 | |

**User's choice:** 评分 + 可选评论

| Option | Description | Selected |
|--------|-------------|----------|
| 一用户一工具一条 Review | upsert 行为，防刷评 | ✓ |
| 允许多条 Review | 论坛模式但管理复杂 | |

**User's choice:** 一用户一工具一条 Review

| Option | Description | Selected |
|--------|-------------|----------|
| 实时重算平均分 | 提交后立即聚合所有 rating | ✓ |
| 定时批量更新 | 减少写入但不实时 | |

**User's choice:** 实时重算平均分

| Option | Description | Selected |
|--------|-------------|----------|
| 评分分布 + 评论列表 | 分布柱状图 + 排序分页列表 | ✓ |
| Review 编辑/删除 | 用户可修改已提交的 Review | |
| 按平台筛选 | 只看某平台用户的评价 | |
| Claude's Discretion | 让 Claude 决定细节 | |

**User's choice:** 评分分布 + 评论列表

---

## Tool Submission 审核流程

| Option | Description | Selected |
|--------|-------------|----------|
| 管理员审核后上架 | PENDING → APPROVED/REJECTED，审核通过才创建 Tool | ✓ |
| 自动创建 + 管理员标记 | 自动创建 PENDING Tool，管理员标记 ACTIVE | |

**User's choice:** 管理员审核后上架

| Option | Description | Selected |
|--------|-------------|----------|
| 只需 repoUrl + 自动抓取 | 最小表单，信息从 GitHub 获取 | ✓ |
| 用户填写全部信息 | 手动填名称/描述/分类等 | |

**User's choice:** 只需 repoUrl + 自动抓取

| Option | Description | Selected |
|--------|-------------|----------|
| 提交确认 + 管理员后台 | 简单确认页，管理员通过后台审核 | ✓ |
| 自动验证 repoUrl + 人工审核 | 实时验证 repo 有效性 | |
| 实时通知 + Web 审核界面 | Slack/邮件通知管理员 | |

**User's choice:** 提交确认 + 管理员后台

| Option | Description | Selected |
|--------|-------------|----------|
| 简单审核页面 | Web 界面列出 PENDING 提交，一键批准/拒绝 | ✓ |
| 仅 API/数据库操作 | 技术人员直接操作数据库 | |

**User's choice:** 简单审核页面

**Multi-select extras:**
- ✓ repoUrl 实时验证 — 提交前检查 GitHub repo 是否存在且公开
- ✓ 去重检查 — 同一 repoUrl 不能重复提交
- ✓ 批准时自动抓取 GitHub 数据 — 复用 Phase 2 sync 逻辑

---

## Tag Voting 系统

| Option | Description | Selected |
|--------|-------------|----------|
| 预设标签 + 投票 | 通用标签集，用户选择投票，类似 Product Hunt | ✓ |
| 自由标签 | 用户自创标签，灵活但质量难控 | |
| 简单赞/踩 | 最简单但不具体 | |

**User's choice:** 预设标签 + 投票

| Option | Description | Selected |
|--------|-------------|----------|
| 通用标签集 | 所有工具类型共用同一标签集，中英双语 | ✓ |
| 按工具类型分标签集 | MCP/Skill/Rule 各有不同标签 | |

**User's choice:** 通用标签集

| Option | Description | Selected |
|--------|-------------|----------|
| 每个工具最多投 3 个标签 | 防止全选，每次点击切换 | ✓ |
| 不限投票数量 | 更自由但可能滥用 | |

**User's choice:** 每个工具最多投 3 个标签

| Option | Description | Selected |
|--------|-------------|----------|
| 新 ToolTagVote 模型 | 存储每票关系，可聚合统计 | ✓ |
| 复用 Tool.tags 字段 | 简单但无法跟踪用户投票 | |

**User's choice:** 新 ToolTagVote 模型

**Multi-select display:**
- ✓ 工具详情页标签展示 + 投票
- ✓ 工具卡片标签展示 (Top 2-3 tags)

---

## Claude's Discretion

- Exact preset tag list and bilingual labels
- Review list UI layout, pagination, empty state
- Admin review page layout and routing
- Tag voting animation and interaction
- Admin user identification method
- Review/Tag mobile responsive behavior
- GitHub API error handling for submission validation

## Deferred Ideas

None — discussion stayed within phase scope
