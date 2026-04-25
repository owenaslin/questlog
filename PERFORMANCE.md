# Performance Optimization Guide

## Current Optimizations

### Lazy Loading

Heavy components are dynamically imported to reduce initial bundle size:

| Component | Lazy Version | Size Impact |
|-----------|--------------|-------------|
| AmbientScene | LazyAmbientScene | ~15KB saved |
| ParticleLayer | LazyParticleLayer | ~8KB saved |

### Bundle Analysis

Run bundle analysis to identify optimization opportunities:

```bash
npm run analyze
```

## Performance Checklist

### Loading Performance

- [ ] Use lazy loading for heavy components
- [ ] Implement code splitting per route
- [ ] Optimize images (WebP, responsive sizes)
- [ ] Use next/font for optimal font loading
- [ ] Enable gzip/brotli compression

### Runtime Performance

- [ ] Memoize expensive calculations with useMemo
- [ ] Use useCallback for stable function references
- [ ] Virtualize long lists
- [ ] Debounce/throttle event handlers
- [ ] Avoid layout thrashing

### Core Web Vitals

| Metric | Target | Current |
|--------|--------|---------|
| LCP | < 2.5s | TBD |
| FID | < 100ms | TBD |
| CLS | < 0.1 | TBD |
| TTFB | < 600ms | TBD |

## Lazy Loading Implementation

### Before

```tsx
import AmbientScene from '@/components/AmbientScene';

export default function Page() {
  return <AmbientScene />;
}
```

### After

```tsx
import LazyAmbientScene from '@/components/LazyAmbientScene';

export default function Page() {
  return <LazyAmbientScene />;
}
```

## Monitoring

Use Vercel Analytics for real-world performance data:

```bash
# Already configured in layout.tsx
import { Analytics } from '@vercel/analytics/react';
```

## Build Output Analysis

```bash
# Analyze build output
npm run build
npx next-bundle-analyzer .next/static/chunks
```

## Future Optimizations

- Implement service worker for offline support
- Add image optimization with next/image
- Implement infinite scroll for quest lists
- Use React Server Components where possible
