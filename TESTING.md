# Testing Guide

This document covers testing setup and practices for Quest Board.

## Test Types

### 1. Unit Tests (Vitest)

Unit tests for utility functions and components.

```bash
# Run all unit tests
npm run test

# Run in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage

# Run specific file
npm run test src/lib/xp.test.ts
```

**Location:** `src/**/*.test.ts`

**Configuration:** `vitest.config.ts`

### 2. E2E Tests (Playwright)

End-to-end tests for critical user flows.

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- homepage.spec.ts
```

**Location:** `e2e/**/*.spec.ts`

**Configuration:** `playwright.config.ts`

### 3. Bundle Analysis

Analyze bundle size and identify optimization opportunities.

```bash
# Analyze production bundle
npm run analyze
```

Opens interactive visualization of bundle composition.

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('does something correctly', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can complete a quest', async ({ page }) => {
  await page.goto('/board');
  await page.click('[data-testid="quest-card"]');
  await page.click('text=Complete Quest');
  await expect(page.locator('text=Quest Completed')).toBeVisible();
});
```

## Accessibility Testing

### Manual Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG 4.5:1 ratio
- [ ] Images have alt text
- [ ] Form labels are associated with inputs
- [ ] No autoplay audio/video

### Automated Tools

```bash
# Install axe-core for accessibility testing
npm install -D @axe-core/playwright
```

## Performance Testing

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Lazy Loading

Heavy components are lazy-loaded to reduce initial bundle:

- `AmbientScene` → `LazyAmbientScene`
- `ParticleLayer` → `LazyParticleLayer`

Usage:
```typescript
import LazyAmbientScene from '@/components/LazyAmbientScene';
```

## CI/CD Integration

Tests run automatically on pull requests:

1. Unit tests with coverage
2. TypeScript type checking
3. E2E tests on multiple browsers
4. Bundle size analysis

## Debugging Tests

### Vitest

```bash
# Debug specific test
npm run test -- --reporter=verbose src/lib/xp.test.ts
```

### Playwright

```bash
# Debug mode
npx playwright test --debug

# Trace viewer
npx playwright show-trace trace.zip
```

## Accessibility Components

### SkipLink

Allows keyboard users to skip navigation:
```tsx
<SkipLink />
```

### VisuallyHidden

Screen-reader only content:
```tsx
<VisuallyHidden>Hidden text for screen readers</VisuallyHidden>
```

### useFocusTrap

Traps focus in modals:
```tsx
const containerRef = useFocusTrap(isModalOpen);
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
