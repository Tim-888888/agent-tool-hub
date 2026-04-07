# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Runner:**
- Jest 30.3.0
- Config: `jest.config.ts` at project root
- Environment: jsdom (via `jest-environment-jsdom`)

**Assertion Library:**
- Jest built-in `expect` (global)
- `@testing-library/jest-dom` for DOM-specific matchers (e.g., `toBeVisible`, `toBeInTheDocument`)

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Test Configuration

**`jest.config.ts`:**
```typescript
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react-jsx',
    }],
  },
};

export default config;
```

**`jest.setup.ts`:**
```typescript
import '@testing-library/jest-dom';
```

**Key Configuration Details:**
- `ts-jest` for TypeScript compilation with `react-jsx` JSX mode
- Module alias `@/` mapped to `src/` (mirrors `tsconfig.json` paths)
- jsdom environment for DOM API availability
- `@testing-library/jest-dom` adds custom matchers globally

## Test File Organization

**Location:**
- Tests live in a separate `__tests__/` directory at project root, mirroring `src/` structure

**Structure:**
```
__tests__/
└── lib/
    ├── utils.test.ts      # Tests for src/lib/utils.ts
    ├── mock-data.test.ts   # Tests for src/lib/mock-data.ts
    └── i18n.test.ts        # Tests for src/lib/i18n.ts
```

**Naming:**
- Test files: `<module-name>.test.ts`
- Located in directory path matching the source path

## Test Structure

**Suite Organization:**
```typescript
import { cn, formatStars, slugify } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });
});
```

**Patterns:**
- `describe()` groups by function or module name
- `it()` describes the specific behavior being tested
- Each `it()` tests one behavior with one assertion or a small set of related assertions
- No `beforeEach`/`afterEach` setup needed (pure functions, no state)
- No test isolation helpers needed (functions are stateless)

**Data Validation Tests:**
```typescript
describe('mock data constants', () => {
  it('each tool has required fields', () => {
    for (const tool of TOOLS) {
      expect(tool.id).toBeTruthy();
      expect(tool.slug).toBeTruthy();
      expect(tool.type).toMatch(/^(MCP_SERVER|SKILL|RULE)$/);
      expect(tool.repoUrl).toMatch(/^https:\/\//);
      expect(Array.isArray(tool.tags)).toBe(true);
    }
  });
});
```

**Sorting/Ordering Tests:**
```typescript
it('sorts by stars descending', () => {
  const result = getTools({ sort: 'stars' });
  for (let i = 1; i < result.length; i++) {
    expect(result[i - 1].stars).toBeGreaterThanOrEqual(result[i].stars);
  }
});
```

## Mocking

**Framework:** Jest built-in mocking

**Current Usage:**
- No mocking required in current tests (all tested code is pure functions and static data)
- No `jest.mock()` calls in any test file
- No `jest.fn()` or `jest.spyOn()` usage

**What to Mock (when writing new tests):**
- `next/navigation` for `useRouter`, `useSearchParams`, `useParams`
- `localStorage` for i18n context tests
- `navigator.clipboard` for CopyButton tests
- `document.createElement` / `document.execCommand` for clipboard fallback

**What NOT to Mock:**
- Pure utility functions (`cn`, `formatStars`, `slugify`, `formatDate`)
- Data accessor functions (`getTools`, `getToolBySlug`)
- i18n lookup function (`t`)
- Translation JSON files

## Fixtures and Factories

**Test Data:**
- Tests import and use the actual mock data from `src/lib/mock-data.ts`
- No separate fixture files or factory functions
- Tests rely on known constants in the mock data (e.g., `'filesystem-mcp'` slug, `'Filesystem MCP Server'` name)

**Location:**
- No dedicated fixtures directory
- Mock data in `src/lib/mock-data.ts` doubles as test data

**i18n Test Data:**
- Tests import actual locale files (`en.json`, `zh.json`) directly
- Completeness test dynamically extracts all keys from `en.json` and verifies `zh.json` has matching keys

```typescript
it('zh has all keys that en has', () => {
  function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }
  // ... key comparison logic
});
```

## Coverage

**Requirements:** None enforced (no coverage thresholds in `jest.config.ts`)

**View Coverage:**
```bash
npm run test:coverage
```

**Current Coverage Scope:**
- Only `src/lib/` modules have tests:
  - `src/lib/utils.ts` -- fully tested (6 functions, all covered)
  - `src/lib/mock-data.ts` -- data access functions tested, constants validated
  - `src/lib/i18n.ts` -- dictionary loading and key lookup tested, completeness verified
- Untested modules:
  - `src/lib/i18n-context.tsx` (React Context provider)
  - `src/lib/db.ts` (stub, commented out)
  - All React components in `src/components/`
  - All page files in `src/app/`
  - `src/i18n/config.ts`

## Test Types

**Unit Tests:**
- Pure utility functions (current focus)
- Data accessor and filter functions
- i18n lookup logic
- These are the only test type currently in the codebase

**Integration Tests:**
- Not present
- Needed for: component rendering with i18n context, filter + data flow, page routing

**E2E Tests:**
- Not present
- Playwright is mentioned in user rules but not installed in this project
- Needed for: tool browsing flow, search, language toggle, theme toggle, form submission

## Common Patterns

**Pure Function Testing:**
```typescript
describe('formatStars', () => {
  it('formats thousands with k suffix', () => {
    expect(formatStars(1000)).toBe('1.0k');
    expect(formatStars(1500)).toBe('1.5k');
    expect(formatStars(83090)).toBe('83.1k');
  });

  it('returns number as string for under 1000', () => {
    expect(formatStars(0)).toBe('0');
    expect(formatStars(999)).toBe('999');
  });
});
```

**Edge Case Testing:**
```typescript
it('returns N/A for null', () => {
  expect(formatDate(null)).toBe('N/A');
});

it('returns undefined for non-existent slug', () => {
  expect(getToolBySlug('non-existent')).toBeUndefined();
});

it('returns empty for non-matching query', () => {
  const result = getTools({ query: 'zzzznonexistent' });
  expect(result).toEqual([]);
});
```

**Fallback/Default Testing:**
```typescript
it('defaults to English for unknown locale', () => {
  const dict = getDictionary('fr');
  expect(dict.nav.home).toBe('Home');
});

it('returns key for missing translation', () => {
  expect(t(en, 'nonexistent.key')).toBe('nonexistent.key');
});

it('returns default for unknown type', () => {
  expect(getToolTypeColor('UNKNOWN')).toBe('var(--text-secondary)');
});
```

## Recommendations for Adding Tests

**New Utility Functions:**
- Add tests to `__tests__/lib/utils.test.ts` or create a new file matching the source path
- Follow `describe` per function, `it` per behavior pattern
- Cover: happy path, edge cases, null/undefined inputs, default returns

**New React Components:**
- Install `@testing-library/react` (already in devDependencies)
- Create test files in `__tests__/components/` mirroring the source path
- Wrap components in `I18nProvider` when testing components that use `useI18n()`
- Mock `next/link` and `next/navigation` as needed

**New Pages:**
- Integration tests in `__tests__/app/`
- Test server component data fetching and metadata generation
- Test client component rendering and interaction

**Testing Checklist for New Code:**
1. Pure functions: unit test in `__tests__/lib/`
2. Components: render test with `@testing-library/react`
3. User interactions: `fireEvent` or `userEvent` for click, input, submit
4. i18n: verify translations exist for any new keys in both `en.json` and `zh.json`
5. Data validation: verify mock data structure matches TypeScript interfaces

---

*Testing analysis: 2026-04-07*
