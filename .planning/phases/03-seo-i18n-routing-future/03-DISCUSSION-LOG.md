# Phase 3: SEO & i18n Routing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 03-seo-i18n-routing-future
**Areas discussed:** i18n Routing Strategy, i18n Data Source, SEO Metadata, Structured Data, Sitemap & robots.txt, Migration & Compatibility

---

## i18n Routing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 仅非默认语言加前缀 | /tools/xxx (en), /zh/tools/xxx (zh). URL更短更干净 | yes |
| 所有语言都加前缀 | /en/tools/xxx, /zh/tools/xxx. 完全明确但URL更长 | |
| 无前缀 + Cookie 检测 | Next.js 内置 i18n middleware, 不推荐（SEO不友好） | |

**User's choice:** 仅非默认语言加前缀
**Notes:** 默认语言 en 不加前缀，中文加 /zh/ 前缀

---

## i18n 技术架构

| Option | Description | Selected |
|--------|-------------|----------|
| App Router [locale] 段 | 使用 Next.js 动态路由段，页面移入 src/app/[locale]/ | yes |
| next.config i18n 配置 | 旧方案，Next.js 16 可能已废弃 | |
| Middleware 重写 | 在 middleware.ts 中检测语言并重写路由 | |

**User's choice:** App Router [locale] 段
**Notes:** 需要研究 Next.js 16 的 breaking changes

---

## 语言检测

| Option | Description | Selected |
|--------|-------------|----------|
| Accept-Language 重定向 | 通过 header 检测，中文则 301 到 /zh/ | yes |
| Cookie + 选择器 | 首次弹语言选择器，存入 Cookie | |
| 仅手动切换 | 始终显示默认语言，用户手动切换 | |

**User's choice:** Accept-Language 重定向

---

## i18n 数据源

| Option | Description | Selected |
|--------|-------------|----------|
| 保留现有 JSON + t() | 继续用 JSON 字典 + React Context | |
| 迁移到 next-intl | 服务端+客户端 i18n 库，类型安全 | |
| Claude 决定 | 最佳技术方案，约束：SEO友好、Next.js 16兼容、保持现有数据 | yes |

**User's choice:** Claude 决定
**Notes:** 关键约束：SEO 友好、与 Next.js 16 兼容、保持现有翻译数据

---

## SEO 元数据生成

| Option | Description | Selected |
|--------|-------------|----------|
| 动态 generateMetadata | 每个页面从数据生成独特 title/description/OG | yes |
| 静态 metadata | 所有页面共用一套 metadata | |
| Claude 决定 | | |

**User's choice:** 动态 generateMetadata

---

## 结构化数据范围

| Option | Description | Selected |
|--------|-------------|----------|
| 工具页嵌入 SoftwareApplication | 按 TECHNICAL_DESIGN.md 定义的 schema | yes |
| 多页面类型全覆盖 | WebSite + SoftwareApplication + CollectionPage | |
| Claude 决定 | | |

**User's choice:** 工具页嵌入 SoftwareApplication

---

## Sitemap 生成

| Option | Description | Selected |
|--------|-------------|----------|
| 动态 sitemap.ts | 基于数据库数据自动生成，每次构建更新 | yes |
| 静态 sitemap.xml | 手动维护 | |
| Claude 决定 | | |

**User's choice:** 动态 sitemap.ts

---

## robots.txt

| Option | Description | Selected |
|--------|-------------|----------|
| robots.ts 配置 | Next.js 方式，允许所有爬虫，禁止 /api/ | yes |
| 静态 robots.txt | 手动维护 | |
| Claude 决定 | | |

**User's choice:** robots.ts 配置

---

## URL 迁移

| Option | Description | Selected |
|--------|-------------|----------|
| 301 重定向旧 URL | middleware 中处理，保留 SEO 权重 | yes |
| 不做重定向 | 旧 URL 返回 404 | |
| Claude 决定 | | |

**User's choice:** 301 重定向旧 URL

---

## API 路由处理

| Option | Description | Selected |
|--------|-------------|----------|
| API 不迁入 [locale] | /api/tools 等保持原样 | yes |
| API 也迁入 [locale] | 一致性更强但没必要 | |
| Claude 决定 | | |

**User's choice:** API 不迁入 [locale]

---

## Claude's Discretion

- i18n 数据源具体实现方案（保留 JSON+t() vs next-intl vs custom）
- 组件重构以兼容服务端 locale
- JSON-LD 字段映射
- Sitemap 的 changeFrequency 和 priority 值
- Middleware 实现细节

## Deferred Ideas

None
