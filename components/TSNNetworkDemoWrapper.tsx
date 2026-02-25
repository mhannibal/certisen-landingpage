'use client';

import dynamic from 'next/dynamic';

const TSNNetworkDemo = dynamic(() => import('@/components/TSNNetworkDemo'), { 
  ssr: false,
  loading: () => (
    <div className="w-full sm:h-[800px] h-[500px] rounded-lg border-2 border-primary-foreground/30 bg-slate-900 flex items-center justify-center">
      <p className="text-primary-foreground/50">Loading editor...</p>
    </div>
  )
});

export default function TSNNetworkDemoWrapper() {
  return <TSNNetworkDemo />;
}
