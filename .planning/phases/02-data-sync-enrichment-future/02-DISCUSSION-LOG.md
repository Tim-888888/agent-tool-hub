# Phase 2: Data Sync & Enrichment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 02-data-sync-enrichment-future
**Areas discussed:** 数据源与同步范围, 评分算法设计, 定时任务架构, GitHub API 策略

---

## 数据源与同步范围

| Option | Description | Selected |
|--------|-------------|----------|
| 仅更新现有工具 | 只同步现有 12 个工具的 GitHub/npm 数据 | ✓ |
| 同步 + 自动发现新工具 | 同步现有 + 从 awesome-* 列表发现新工具 | |
| 全量搜索重建 | 基于 GitHub topic/npm keyword 搜索所有相关包 | |

**User's choice:** 仅更新现有工具
**Notes:** 新工具发现留给后续 phase

**从 GitHub 获取哪些数据：**

| Option | Description | Selected |
|--------|-------------|----------|
| 基础仓库信息 | stars、forks、openIssues、lastCommitAt、language、license | |
| 基础信息 + README 解析 | 基础信息 + 解析 README 提取 features、installGuide | ✓ |
| 基础信息 + npm 下载量 | 基础信息 + npm 下载量统计 | |

**User's choice:** 基础信息 + README 解析
**Notes:** README 解析填充 featuresZh/En 和 installGuide 字段

---

## 评分算法设计

| Option | Description | Selected |
|--------|-------------|----------|
| 加权总分 | stars(0-40) + 活跃度(0-20) + npm下载(0-20) + 社区互动(0-20) | ✓ |
| 时间衰减热度 | 类似 HN 算法，时间衰减 + 初始热度 | |
| Claude 决定 | 基于行业最佳实践 | |

**User's choice:** 加权总分
**Notes:** 仅用于排序，不展示具体分数

**活跃度衡量：**

| Option | Description | Selected |
|--------|-------------|----------|
| 最近提交时间 | lastCommitAt 距今天数，30天内满分，1年后零分 | ✓ |
| 90天提交频率 | 最近 90 天 commits 数量 | |
| Claude 决定 | 只要能反映工具是否还在维护 | |

---

## 定时任务架构

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Cron | /api/sync 作为 cron endpoint，免费版每天 1 次 | ✓ |
| Supabase pg_cron | 数据库级定时任务 | |
| 手动触发脚本 | npx tsx scripts/sync.ts | |

**同步频率：** 每天 1 次
**错误处理：** 重试 3 次 + 日志

---

## GitHub API 策略

| Option | Description | Selected |
|--------|-------------|----------|
| Personal Token | GITHUB_TOKEN from .env，5000 请求/小时 | ✓ |
| GitHub App | 创建 GitHub App，支持安装到组织 | |

**Rate limit：** 检查配额 + 延迟
**npm 数据：** GitHub + npm（获取下载量、版本信息）

---

## Claude's Discretion

- README 解析逻辑
- 分数字段命名和存储
- npm API 集成细节
- 日志实现
- 无 GitHub 仓库或 npm 包的工具处理

## Deferred Ideas

- 自动发现新工具 — future phase
- GitHub App 认证 — 社区提交场景时再考虑
- Webhook 实时同步 — 当前规模不需要
