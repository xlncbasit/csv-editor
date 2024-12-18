'use client';

import { Suspense } from 'react';
import { LoadingPage } from '@/components/loading-page';
import { ConfigurationEditor } from '@/components/configuration-editor';

function MainContent() {
  return (
    <div className="flex-1">
      <ConfigurationEditor />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <MainContent />
    </Suspense>
  );
}