# Phase 4: Community Features (Future) - Research

**Researched:** 2026-04-08
**Domain:** Authentication (Auth.js v5), Community Features (Reviews, Submissions, Tag Voting), Prisma Schema Evolution
**Confidence:** HIGH

## Summary

Phase 4 为 AgentToolHub 引入完整的社区功能层：GitHub OAuth 认证、用户评价/评分系统、工具提交流程（含管理审核）、以及标签投票系统。这是从「只读目录」到「社区驱动平台」的关键转变。

核心实现包含三个子系统：(1) 基于 Auth.js v5 (next-auth@beta) 的 GitHub OAuth 认证，配合 Prisma Adapter 持久化用户数据；(2) 评价系统，采用 upsert 模式实现每用户每工具一条评价，实时聚合 avgRating/ratingCount；(3) 工具提交系统，复用 Phase 2 已有的 GitHub API 客户端进行 repoUrl 校验和自动数据抓取。标签投票系统使用预设标签列表（双语 en/zh），每用户每工具最多投 3 票。

**Primary recommendation:** 使用 Auth.js v5 beta + @auth/prisma-adapter 构建认证层；所有新 API 端点复用已有 `api-utils.ts` 的 successResponse/errorResponse 模式；提交审核时直接复用 `github-client.ts` 中的 `parseRepoUrl` + `fetchRepoData` 逻辑。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** GitHub OAuth login required for ALL community actions (Review + Submission + Tag Voting)
- **D-02:** Use NextAuth.js (Auth.js) with GitHub Provider — read-only basic info scope (username + avatar only)
- **D-03:** New User model needed in Prisma schema — store GitHub ID, username, avatar, email (optional)
- **D-04:** JWT-based session strategy (stateless)
- **D-05:** Reviews publish immediately — no admin pre-moderation
- **D-06:** Required: rating (1-5). Optional: content, platform, useCase
- **D-07:** One review per user per tool — upsert behavior
- **D-08:** Recalculate avgRating and ratingCount in real-time after review
- **D-09:** Rating distribution bar chart + sorted/paginated review list
- **D-10:** Review model needs userId added
- **D-11:** Admin review workflow — PENDING → APPROVED/REJECTED
- **D-12:** Submit form: only repoUrl required, optional notes/suggestedTags
- **D-13:** Auto-validate repoUrl via GitHub API
- **D-14:** Deduplication check on repoUrl
- **D-15:** On approval: auto-fetch GitHub data using Phase 2 sync logic
- **D-16:** Simple admin review page with approve/reject buttons
- **D-17:** Post-submission: "received, pending review" confirmation
- **D-18:** Preset tag list — universal, bilingual (en/zh)
- **D-19:** Each user can vote up to 3 tags per tool, click to toggle
- **D-20:** New ToolTagVote model: toolId, tagSlug, userId, createdAt
- **D-21:** Display top tags with vote counts on tool detail
- **D-22:** Display top 2-3 tags on ToolCard component
- **D-23:** Tag preset list in code/config, not user-generated

### Claude's Discretion
- Exact preset tag list and bilingual labels
- Review list UI layout, pagination style, empty state
- Admin review page layout and routing (/admin/submissions?)
- Tag voting animation and interaction details
- How to identify admin users (env var whitelist? GitHub team membership?)
- Review/Tag sections responsive behavior on mobile
- Error handling for GitHub API calls during submission validation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.0.0-beta.30 | GitHub OAuth 认证 + JWT session | Auth.js v5 是 Next.js 官方推荐的认证方案，原生支持 App Router 和 Next.js 16 [VERIFIED: npm registry] |
| @auth/prisma-adapter | 2.11.1 | Auth.js 的 Prisma 持久化适配器 | 官方维护，peer dep 支持 @prisma/client >=6，兼容项目 Prisma 7.6.0 [VERIFIED: npm registry] |
| zod | 4.3.6 | API 输入验证 | TypeScript 生态标准 schema 验证库，已安装项目中未声明但 npm 可用 [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @auth/core | (随 next-auth 安装) | Auth.js 核心，提供 GitHubProvider | next-auth 的 peer dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js v5 | Clerk | Clerk 是托管方案，无需自建认证逻辑，但需要付费且数据不在自己的数据库 |
| Auth.js v5 | Lucia | Lucia 已停止维护 (2024)，不推荐新项目使用 |
| JWT session | Database session | Database session 更安全但需要额外的 session 存储和查询开销，对社区功能场景 JWT 足够 |

**Installation:**
```bash
npm install next-auth@beta @auth/prisma-adapter zod
```

**Version verification:**
- `next-auth@beta` → 5.0.0-beta.30 [VERIFIED: npm registry, 2026-04-08]
- `@auth/prisma-adapter` → 2.11.1 [VERIFIED: npm registry, 2026-04-08]
- `zod` → 4.3.6 [VERIFIED: npm registry, 2026-04-08]
- 项目已有 Prisma 7.6.0 + @prisma/client 7.6.0 + @prisma/adapter-pg 7.6.0 [VERIFIED: package.json]

## Architecture Patterns

### Auth.js v5 集成模式（Next.js 16）

**关键要点：** Next.js 16 使用 `proxy.ts` 而非 `middleware.ts` [ASSUMED]。AGENTS.md 明确警告需查阅 `node_modules/next/dist/docs/`，实现时必须先读相关文档。

**文件结构：**
```
src/
├── auth.ts                          # Auth.js 配置（根目录）
├── app/
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts                 # Auth.js route handler
│   ├── api/tools/[slug]/
│   │   ├── reviews/route.ts         # GET (list) + POST (submit) reviews
│   │   └── tags/route.ts            # GET (tag counts) + POST (vote/unvote)
│   ├── api/submit/route.ts          # POST tool submission
│   ├── api/admin/submissions/
│   │   └── route.ts                 # GET (list pending) + PATCH (approve/reject)
│   └── admin/submissions/page.tsx   # Admin review page
```

### Pattern 1: Auth.js v5 配置模式
**What:** 在项目根目录创建 `auth.ts`，导出 handlers、signIn、signOut、auth
**When to use:** 这是 Auth.js v5 的标准配置方式，唯一推荐的集成模式
**Example:**
```typescript
// src/auth.ts
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### Pattern 2: Auth-guarded API Route 模式
**What:** 使用 `await auth()` 在 Server Component / Route Handler 中获取 session
**When to use:** 所有需要认证的 API 端点
**Example:**
```typescript
// src/app/api/tools/[slug]/reviews/route.ts
import { auth } from "@/auth"
import { successResponse, errorResponse } from "@/lib/api-utils"

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return errorResponse("Authentication required", 401)
  }

  const body = await request.json()
  // ... validation + upsert logic
}
```

### Pattern 3: Review Upsert 模式
**What:** 每用户每工具一条评价，再次提交则更新
**When to use:** Review submission (D-07)
**Example:**
```typescript
// Prisma upsert 基于 userId + toolId 唯一约束
await prisma.review.upsert({
  where: { userId_toolId: { userId: session.user.id, toolId: tool.id } },
  create: { userId: session.user.id, toolId: tool.id, rating, content, platform, useCase },
  update: { rating, content, platform, useCase },
})

// 然后重新计算 avgRating 和 ratingCount
const stats = await prisma.review.aggregate({
  where: { toolId: tool.id },
  _avg: { rating: true },
  _count: true,
})
await prisma.tool.update({
  where: { id: tool.id },
  data: { avgRating: stats._avg.rating ?? 0, ratingCount: stats._count },
})
```

### Pattern 4: Submission Approval 复用 Sync 逻辑
**What:** 提交审核通过时，复用 Phase 2 的 GitHub API 客户端抓取数据
**When to use:** Admin approve 操作 (D-15)
**Example:**
```typescript
// 复用 src/lib/github-client.ts 中的 parseRepoUrl + fetchRepoData
// 复用 src/lib/readme-parser.ts 中的 extractFeatures + extractInstallGuide
// 参考 src/app/api/sync/route.ts 的并行获取模式

const parsed = parseRepoUrl(submission.repoUrl)
if (!parsed) return errorResponse("Invalid repo URL", 400)

const [repoResult, readmeResult] = await Promise.allSettled([
  fetchRepoData(parsed.owner, parsed.repo),
  fetchReadme(parsed.owner, parsed.repo),
])
// ... 处理结果并创建 Tool 记录
```

### Anti-Patterns to Avoid
- **不要在客户端调用 Prisma:** 所有数据库操作必须在 Route Handler 或 Server Component 中完成
- **不要自己实现密码认证:** 锁定 GitHub OAuth，不需要其他认证方式
- **不要在 middleware/proxy 中做重计算:** Next.js 16 的 proxy.ts 只做轻量路由守卫（如重定向未认证用户），不执行数据库查询
- **不要手动管理 session 存储:** JWT session 完全由 Auth.js 管理，不需要额外的 session 表
- **不要忘记添加 @@unique 约束:** Review 的 userId+toolId 必须有唯一约束才能支持 upsert

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth 认证流程 | 自己实现 GitHub OAuth code exchange | Auth.js GitHubProvider | OAuth 流程复杂（CSRF token、state、code exchange、token refresh），Auth.js 已处理所有边界情况 |
| Session 管理 | 自己实现 JWT 编解码 + 验证 | Auth.js session callbacks | JWT 安全是专业领域，签名算法选择、密钥管理、过期处理都有坑 |
| 密码哈希 | 任何形式的密码存储 | 不需要（纯 OAuth） | D-02 锁定 GitHub OAuth，无密码场景 |
| 输入验证 | 手写 if/else 验证 | Zod schema | Zod 提供类型安全的验证 + 错误信息生成，且可以推断 TypeScript 类型 |
| GitHub API 调用 | 重写 fetch 逻辑 | 已有 `github-client.ts` | `parseRepoUrl` + `fetchRepoData` + `fetchReadme` 已在 Phase 2 实现，含 rate limit 追踪 |
| API 响应格式 | 自建响应包装 | 已有 `api-utils.ts` | `successResponse` + `errorResponse` 已是项目标准，所有端点必须复用 |
| Prisma 数据库操作 | 原始 SQL | Prisma query API | 项目已全面使用 Prisma ORM + PrismaPg adapter，保持一致 |

**Key insight:** Phase 4 的核心工程价值在于「复用」而非「新建」。Auth.js 处理认证、已有 API helpers 处理响应格式、已有 GitHub client 处理数据抓取。新代码主要集中在业务逻辑编排层。

## Common Pitfalls

### Pitfall 1: Auth.js v5 Beta API 不稳定
**What goes wrong:** Auth.js v5 仍在 beta，API 可能与文档不一致
**Why it happens:** next-auth@beta 5.0.0 尚未正式发布 GA
**How to avoid:** 安装后检查实际导出的类型，以安装版本的实际 API 为准；查阅 `node_modules/next-auth` 的类型声明
**Warning signs:** TypeScript 类型错误提示 export 不存在

### Pitfall 2: Prisma Adapter 需要特定的 Schema 结构
**What goes wrong:** Auth.js PrismaAdapter 期望特定的 User/Account/Session/VerificationToken 模型结构
**Why it happens:** Adapter 依赖固定字段名（如 `emailVerified`、`accounts` relation 等）
**How to avoid:** 严格按照 Auth.js 官方 Prisma schema 模板定义 User 模型，不要自定义字段名。可添加额外字段但不能缺少必需字段
**Warning signs:** 登录时报 `Invalid column` 或 `relation not found` 错误

### Pitfall 3: JWT Session 不包含自定义字段
**What goes wrong:** `session.user.id` 为 undefined
**Why it happens:** JWT 默认只包含 name、email、image，需要通过 callbacks 显式传递自定义字段
**How to avoid:** 在 `callbacks.jwt` 中把 user.id 写入 token，在 `callbacks.session` 中把 token.id 写入 session.user.id（参见 Pattern 1）
**Warning signs:** API 端点获取不到 userId

### Pitfall 4: Review Upsert 缺少唯一约束
**What goes wrong:** `prisma.review.upsert` 报错 "where clause must be unique"
**Why it happens:** Prisma upsert 的 where 子句必须是 @@unique 约束
**How to avoid:** 在 Review 模型上添加 `@@unique([userId, toolId])`
**Warning signs:** Prisma migrate 失败或运行时报错

### Pitfall 5: Next.js 16 Breaking Changes
**What goes wrong:** 使用 Next.js 15 的 middleware.ts 模式导致不工作
**Why it happens:** Next.js 16 有 breaking changes（AGENTS.md 明确警告）
**How to avoid:** 实现前先读 `node_modules/next/dist/docs/01-app/` 下的相关指南；proxy.ts 替代 middleware.ts [ASSUMED]
**Warning signs:** 认证路由不匹配，session 读取失败

### Pitfall 6: GitHub API Rate Limit
**What goes wrong:** 提交验证时 GitHub API 返回 403
**Why it happens:** 未认证的 GitHub API 限制 60 次/小时
**How to avoid:** 确保提交验证使用已有的 `GITHUB_TOKEN` env var（已在 `.env.example` 中配置）；复用 `github-client.ts` 的 getHeaders() 函数
**Warning signs:** 高峰期大量提交失败

### Pitfall 7: Tag 投票并发竞争
**What goes wrong:** 并发投票导致超过 3 票限制
**Why it happens:** 先查后写的 TOCTOU 问题
**How to avoid:** 在数据库层面做验证——提交投票前用 `count` 查询验证，或使用 Prisma 事务确保一致性
**Warning signs:** 同一用户对同一工具投了 4+ 票

### Pitfall 8: avgRating 精度问题
**What goes wrong:** 多次 upsert 后 avgRating 显示异常小数
**Why it happens:** 浮点精度累积误差
**How to avoid:** 使用 Prisma `aggregate._avg` 从原始数据重新计算，不使用增量更新
**Warning signs:** avgRating 显示为 4.333333333 等非预期值

## Code Examples

### Auth.js Prisma Schema (必需的模型)
```typescript
// prisma/schema.prisma — 需要添加的模型

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  reviews       Review[]
  submissions   Submission[]
  tagVotes      ToolTagVote[]

  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model ToolTagVote {
  id        String   @id @default(cuid())
  toolId    String
  tagSlug   String
  userId    String
  createdAt DateTime @default(now())

  tool  Tool  @relation(fields: [toolId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([toolId, tagSlug, userId])
  @@index([toolId])
  @@index([toolId, tagSlug])
}
```

### Review Schema 变更
```typescript
// 现有 Review 模型需要添加:
model Review {
  id          String   @id @default(cuid())
  toolId      String
  tool        Tool     @relation(fields: [toolId], references: [id], onDelete: Cascade)
  userId      String                          // 新增
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)  // 新增
  rating      Int
  content     String?
  platform    String?
  useCase     String?
  createdAt   DateTime @default(now())

  @@unique([userId, toolId])  // 新增：支持 upsert
  @@index([toolId])
  @@index([userId])           // 新增
}

// Submission 模型需要添加:
model Submission {
  // ... 现有字段 ...
  userId      String?                         // 新增（可选，兼容旧数据）
  user        User?     @relation(fields: [userId], references: [id])  // 新增
  // ... 其余不变 ...
}
```

### Tag 投票 API 模式
```typescript
// src/app/api/tools/[slug]/tags/route.ts

// POST: 投票/取消投票
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await auth()
  if (!session?.user?.id) return errorResponse("Authentication required", 401)

  const { tagSlug } = await request.json()
  if (!PRESET_TAGS.find(t => t.slug === tagSlug)) return errorResponse("Invalid tag", 400)

  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } })
  if (!tool) return errorResponse("Tool not found", 404)

  // 检查是否已投票
  const existing = await prisma.toolTagVote.findUnique({
    where: { toolId_tagSlug_userId: { toolId: tool.id, tagSlug, userId: session.user.id } }
  })

  if (existing) {
    // 取消投票
    await prisma.toolTagVote.delete({ where: { id: existing.id } })
    return successResponse({ action: "unvoted", tagSlug })
  }

  // 检查投票数限制 (D-19: 最多 3 票)
  const voteCount = await prisma.toolTagVote.count({
    where: { toolId: tool.id, userId: session.user.id }
  })
  if (voteCount >= 3) return errorResponse("Max 3 tags per tool", 400)

  // 投票
  await prisma.toolTagVote.create({
    data: { toolId: tool.id, tagSlug, userId: session.user.id }
  })
  return successResponse({ action: "voted", tagSlug })
}
```

### Submission Approval 复用 Sync 逻辑
```typescript
// PATCH /api/admin/submissions — approve action

const parsed = parseRepoUrl(submission.repoUrl)
if (!parsed) return errorResponse("Invalid repo URL", 400)

const { owner, repo } = parsed

// 复用 Phase 2 的并行获取模式
const [repoResult, readmeResult] = await Promise.allSettled([
  fetchRepoData(owner, repo),
  fetchReadme(owner, repo),
])

const repoData = repoResult.status === "fulfilled" ? repoResult.value : null
const readmeContent = readmeResult.status === "fulfilled" ? readmeResult.value : null

if (!repoData) return errorResponse("Cannot fetch repo data", 400)

// 复用 readme parser
const features = readmeContent ? extractFeatures(readmeContent) : []
const installGuide = readmeContent ? extractInstallGuide(readmeContent) : null

// 创建 Tool 记录
const tool = await prisma.tool.create({
  data: {
    slug: repo,  // 或基于 name 生成
    name: repoData.name || repo,
    description: repoData.description ?? "",
    repoUrl: submission.repoUrl,
    type: "MCP_SERVER",  // 默认类型，可从 suggestedTags 推断
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    language: repoData.language,
    license: repoData.license?.key,
    lastCommitAt: new Date(repoData.pushed_at),
    featuresEn: features.length > 0 ? features : [],
    installGuide: installGuide ? { markdown: installGuide } : null,
    status: "ACTIVE",
    score: computeScore({
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      lastCommitAt: new Date(repoData.pushed_at),
      npmDownloads: null,
    }),
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-auth v4 | Auth.js v5 (next-auth@beta) | 2024+ | v5 完全重写了 API，不兼容 v4 的配置方式；配置从页面级改为根级 auth.ts |
| Next.js middleware.ts | proxy.ts [ASSUMED] | Next.js 16 (2026) | 路由守卫机制可能有变化 |
| Prisma client 直接实例化 | PrismaPg adapter 模式 | 项目已采用 | 需要 `@prisma/adapter-pg` + `new PrismaPg()` 创建客户端 |
| 数据库 session 存储 | JWT session | D-04 锁定 | 无需 session 表，但需要 AUTH_SECRET env var |

**Deprecated/outdated:**
- `next-auth` v4 配置方式（`NextAuth()` 函数直接调用）：已被 v5 的 `export const { handlers } = NextAuth({...})` 替代
- Lucia auth 库：已停止维护，不适用于新项目
- `next-auth/middleware`：v5 中可能已变更，需查 Next.js 16 文档确认

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 运行时 | ✓ | — | — |
| npm | 包管理 | ✓ | — | — |
| PostgreSQL (Supabase) | 数据库 | ✓ (via DATABASE_URL) | — | — |
| GITHUB_TOKEN env | GitHub API 调用 | ✓ (已在 .env) | — | 无 token 时 rate limit 60次/小时 |
| AUTH_SECRET env | Auth.js JWT 签名 | ✗ | — | 需要新增到 .env |
| GITHUB_ID env | GitHub OAuth App ID | ✗ | — | 需要在 GitHub 创建 OAuth App |
| GITHUB_SECRET env | GitHub OAuth App Secret | ✗ | — | 需要在 GitHub 创建 OAuth App |

**Missing dependencies with no fallback:**
- `AUTH_SECRET` — Auth.js 必需，用于 JWT 签名。可用 `npx auth secret` 生成
- `GITHUB_ID` + `GITHUB_SECRET` — 需要在 GitHub Developer Settings 创建 OAuth App，callback URL 设为 `https://[domain]/api/auth/callback/github`
- 本地开发时 callback URL 为 `http://localhost:3000/api/auth/callback/github`

**Missing dependencies with fallback:**
- 无

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.ts` |
| Quick run command | `npm test -- --testPathPattern="<pattern>"` |
| Full suite command | `npm test` |

### Test Infrastructure Gaps (Wave 0)

现有测试目录 `tests/` 下有 `api/`、`lib/`、`integration/` 子目录但当前为空（无 .test.* 文件）。Phase 4 需要以下测试基础设施：

- [ ] `tests/api/reviews.test.ts` — Review API endpoints (CRUD, upsert, aggregation)
- [ ] `tests/api/submit.test.ts` — Submission API (validate, deduplicate, create)
- [ ] `tests/api/admin-submissions.test.ts` — Admin approve/reject workflow
- [ ] `tests/api/tag-votes.test.ts` — Tag voting toggle + limit enforcement
- [ ] `tests/lib/auth-helpers.test.ts` — Auth guard utilities
- [ ] `tests/integration/review-aggregation.test.ts` — Review → avgRating recalculation
- [ ] `jest.setup.ts` 可能需要 Auth.js mock

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="<module>"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 GitHub OAuth — 不自建认证 |
| V3 Session Management | yes | Auth.js JWT session — 不自建 session |
| V4 Access Control | yes | Admin whitelist (env var) + auth guard per endpoint |
| V5 Input Validation | yes | Zod schema validation on all API inputs |
| V6 Cryptography | yes | AUTH_SECRET for JWT signing — Auth.js 管理 |
| V7 Error Handling | yes | 使用 errorResponse，不泄露内部错误详情 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSRF on review/submission | Tampering | Auth.js 内置 CSRF 保护 + SameSite cookies |
| XSS in review content | Tampering | React 默认转义 + 服务端 sanitize |
| Rating manipulation | Tampering | Server-side user verification + one review per tool constraint |
| Unauthorized admin access | Elevation | Server-side admin check (env whitelist) |
| GitHub API abuse via submission | Denial of Service | Rate limiting on submission endpoint |
| Tag vote flooding | Denial of Service | Rate limiting + 3-vote cap per user per tool |
| OAuth token theft | Information Disclosure | Auth.js handles token storage securely |

### CSRF Protection
Auth.js v5 默认提供 CSRF 保护（双重提交 cookie 模式）。不需要额外实现。

### Rate Limiting
目前项目没有 rate limiting 中间件。建议：
- 对 `/api/submit` 限制每用户每小时 5 次提交
- 对 review/tag 投票端点限制每用户每分钟 10 次操作
- 可以用简单的内存 Map 实现（单实例部署足够），或引入 Vercel 的 Edge Middleware rate limiter

## 新建文件清单

| 文件路径 | 用途 |
|---------|------|
| `src/auth.ts` | Auth.js v5 配置（handlers, providers, callbacks） |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js route handler |
| `src/app/api/tools/[slug]/reviews/route.ts` | Review GET (列表) + POST (提交) |
| `src/app/api/tools/[slug]/tags/route.ts` | Tag 投票 GET (统计) + POST (投票/取消) |
| `src/app/api/submit/route.ts` | Tool 提交 POST |
| `src/app/api/admin/submissions/route.ts` | Admin 审核 GET (列表) + PATCH (通过/拒绝) |
| `src/app/admin/submissions/page.tsx` | Admin 审核页面 |
| `src/lib/tag-presets.ts` | 预设标签列表（双语 en/zh） |
| `src/lib/auth-helpers.ts` | 认证辅助函数（isAdmin, requireAuth） |
| `src/components/auth/LoginButton.tsx` | GitHub 登录按钮（客户端组件） |
| `src/components/tools/ReviewForm.tsx` | 评价提交表单（交互式星级选择） |
| `src/components/tools/RatingDistribution.tsx` | 评分分布柱状图 |
| `src/components/tools/ReviewList.tsx` | 评价列表（分页） |
| `src/components/tools/TagVoting.tsx` | 标签投票组件 |
| `src/components/tools/SubmitForm.tsx` | 工具提交表单 |
| `src/components/auth/SessionProvider.tsx` | Auth.js SessionProvider wrapper |

## 修改文件清单

| 文件路径 | 变更内容 |
|---------|---------|
| `prisma/schema.prisma` | 添加 User, Account, ToolTagVote 模型；Review 添加 userId + @@unique；Submission 添加 userId |
| `src/app/layout.tsx` | 包裹 SessionProvider |
| `src/components/tools/ReviewSection.tsx` | 从 22 行骨架扩展为完整的评分分布 + 评价列表 + 提交表单 |
| `src/components/shared/StarRating.tsx` | 添加交互模式（可点击选择星级） |
| `src/components/tools/ToolCard.tsx` | 添加 top 2-3 tags 显示 (D-22) |
| `src/app/[locale]/tools/[slug]/ToolDetailClient.tsx` | 集成 ReviewForm + TagVoting 组件 |
| `src/app/[locale]/submit/page.tsx` | 从占位符替换为真实提交表单 |
| `.env` + `.env.example` | 添加 AUTH_SECRET, GITHUB_ID, GITHUB_SECRET |
| `docs/TECHNICAL_DESIGN.md` | 更新 API 端点文档 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16 使用 `proxy.ts` 替代 `middleware.ts` | Architecture Patterns | 路由守卫机制不工作，需要找到正确的拦截方式 |
| A2 | Auth.js PrismaAdapter 兼容 PrismaPg adapter 模式 | Standard Stack | 需要调整 Prisma client 初始化方式 |
| A3 | Auth.js v5 beta API 与文档一致 | Pitfalls | 可能需要 workaround 或等待新版本 |
| A4 | Admin 用户通过 env var 白名单识别 | Security | 如果改用 GitHub team membership 则需要额外 API 调用 |

**Tags marked [ASSUMED] need user confirmation before execution.**

## Open Questions

1. **Admin 用户识别机制**
   - What we know: Claude's Discretion 范围内，可以选择 env var 白名单或 GitHub team membership
   - What's unclear: 用户是否有偏好
   - Recommendation: 使用 env var `ADMIN_GITHUB_IDS=userid1,userid2` 作为 MVP 方案，后续可扩展为 GitHub team check

2. **Next.js 16 proxy.ts 确切行为**
   - What we know: AGENTS.md 警告有 breaking changes
   - What's unclear: proxy.ts 是否替代 middleware.ts，以及 auth 路由守卫的具体实现方式
   - Recommendation: 实现前读取 `node_modules/next/dist/docs/` 下的指南

3. **PrismaAdapter 与 PrismaPg 的兼容性**
   - What we know: @auth/prisma-adapter 2.11.1 支持 Prisma >=6，项目使用 PrismaPg adapter
   - What's unclear: PrismaAdapter 是否兼容 PrismaPg 的 adapter 初始化模式
   - Recommendation: 实现时测试，如果 PrismaAdapter 不兼容 PrismaPg，可能需要切换到标准 PrismaClient 初始化方式用于 auth models

4. **Zod 是否已安装**
   - What we know: package.json 中没有 zod，但 npm registry 确认 4.3.6 可用
   - What's unclear: 是否有其他方式引入（如 indirect dependency）
   - Recommendation: 明确 `npm install zod` 添加到 dependencies

## Sources

### Primary (HIGH confidence)
- npm registry — next-auth@beta 5.0.0-beta.30, @auth/prisma-adapter 2.11.1, zod 4.3.6 版本验证
- `prisma/schema.prisma` — 现有数据模型结构
- `src/lib/api-utils.ts` — 已有 API 工具函数
- `src/lib/github-client.ts` — 已有 GitHub API 客户端
- `src/app/api/sync/route.ts` — 可复用的同步逻辑参考
- `package.json` — 当前依赖版本

### Secondary (MEDIUM confidence)
- Auth.js v5 安装文档 (authjs.dev) — 配置模式和 Route Handler 结构
- 项目源码分析 — ReviewSection, StarRating, ToolCard, ToolDetailClient 现有实现

### Tertiary (LOW confidence)
- Next.js 16 proxy.ts 替代 middleware.ts — 未验证 [ASSUMED]
- Auth.js PrismaAdapter 与 PrismaPg adapter 兼容性 — 未验证 [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry 验证版本，已有代码验证复用点
- Architecture: MEDIUM — Auth.js v5 模式来自官方文档，但 Next.js 16 breaking changes 未完全验证
- Pitfalls: HIGH — 基于 Auth.js 生态的已知问题和项目实际代码分析

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — Auth.js v5 beta 可能更新)
