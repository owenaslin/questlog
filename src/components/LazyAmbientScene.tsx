'use client';

import dynamic from 'next/dynamic';

// Lazy load AmbientScene to reduce initial bundle size
const AmbientScene = dynamic(() => import('./AmbientScene'), {
  ssr: false,
  loading: () => (
    <div 
      className="fixed inset-0 -z-10 bg-gradient-to-b from-retro-black to-retro-darkblue"
      aria-hidden="true"
    />
  ),
});

export default AmbientScene;
