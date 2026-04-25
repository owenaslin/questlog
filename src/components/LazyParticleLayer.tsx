'use client';

import dynamic from 'next/dynamic';

// Lazy load ParticleLayer to reduce initial bundle size
const ParticleLayer = dynamic(() => import('./ParticleLayer'), {
  ssr: false,
  loading: () => <div aria-hidden="true" />, // No visual placeholder for particles
});

export default ParticleLayer;
