---
phase: 3
slug: seo-i18n-routing-future
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 with ts-jest |
| **Config file** | `jest.config.ts` |
| **Quick run command** | `npm test -- --testPathPattern="i18n\|sitemap\|robots\|proxy" --no-coverage` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="i18n\|sitemap\|robots\|proxy" --no-coverage`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | D-01/D-02 | T-3-01 / — | Locale routing enforces prefix only for non-default | unit | `npm test -- --testPathPattern="proxy" -t "locale prefix"` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | D-03 | — | Accept-Language detection redirects Chinese users | unit | `npm test -- --testPathPattern="proxy" -t "detects locale"` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | D-07/D-08 | — | generateMetadata returns locale-aware title/description | unit | `npm test -- --testPathPattern="metadata"` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | D-09 | — | JSON-LD SoftwareApplication schema on tool pages | unit | `npm test -- --testPathPattern="jsonld"` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | D-10 | — | Sitemap includes both locale URL variants | integration | `curl /sitemap.xml` after build | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | D-11 | — | robots.txt disallows /api/ | integration | `curl /robots.txt` after build | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/proxy/proxy.test.ts` — stubs for proxy locale detection and routing
- [ ] `__tests__/lib/metadata.test.ts` — stubs for generateMetadata tests
- [ ] `__tests__/lib/jsonld.test.ts` — stubs for JSON-LD schema tests
- [ ] Existing infrastructure covers Jest/ts-jest setup

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invalid locale returns 404 | D-02 | Requires dev server | Start dev server, visit `/fr/tools/xxx`, verify 404 |
| JSON-LD valid on tool detail pages | D-09 | Schema.org validator | Visit tool page, copy JSON-LD, paste into validator.schema.org |
| Locale switcher changes URL | D-02 | E2E browser interaction | Click locale switcher, verify URL changes to `/zh/...` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
