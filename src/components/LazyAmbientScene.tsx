'use client';

import dynamic from 'next/dynamic';

// Lazy load AmbientScene to reduce initial bundle size
const AmbientScene = dynamic(() => import('./AmbientScene'), {
  ssr: false,
  loading: () => (
    <div 
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
    />
  ),
});

export default AmbientScene;
