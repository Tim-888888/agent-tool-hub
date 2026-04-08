---
phase: 04
slug: community-features-future
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | jest.config.ts |
| **Quick run command** | `npx jest --passWithNoTests --no-coverage` |
| **Full suite command** | `npx jest --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --passWithNoTests --no-coverage`
- **After every plan wave:** Run `npx jest --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | D-01~D-04 | T-04-01 | GitHub OAuth scope limited to read-only | unit | `npx jest --testPathPattern auth` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | D-03 | — | User model stores minimal PII | unit | `npx jest --testPathPattern user` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | D-05~D-10 | T-04-02 | One review per user enforced, no XSS in content | unit+integ | `npx jest --testPathPattern review` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | D-11~D-17 | T-04-03 | Submission dedup, repoUrl validation, admin-only routes | unit+integ | `npx jest --testPathPattern submit` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | D-18~D-23 | — | Max 3 tags per user enforced, preset tags only | unit | `npx jest --testPathPattern tag` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 3 | All | — | E2E: login → review → submit tool → vote tags | e2e | manual | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/auth/__tests__/` — stubs for Auth.js route + session tests
- [ ] `src/app/api/tools/[slug]/reviews/__tests__/` — stubs for review API tests
- [ ] `src/app/api/submit/__tests__/` — stubs for submission API tests
- [ ] `src/app/api/tools/[slug]/tags/__tests__/` — stubs for tag voting API tests
- [ ] `src/app/api/admin/submissions/__tests__/` — stubs for admin API tests
- [ ] `npm install next-auth@beta @auth/prisma-adapter zod` — if not installed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub OAuth login flow | D-01, D-02 | Requires browser redirect + GitHub OAuth consent | Click "Login with GitHub", verify session cookie set |
| Review display on tool page | D-09 | Visual layout verification | Submit review, verify rating distribution chart + review list renders |
| Tag voting inline UX | D-21, D-22 | Click interaction + animation | Click tag to vote, verify count increment, click again to unvote |
| Admin submission review page | D-16 | Role-based access + approve/reject flow | Login as admin, visit /admin/submissions, approve a pending submission |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
