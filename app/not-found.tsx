'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-page';
import { Button } from '@/components/ui/button';

function NotFoundContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('return') || '/';

  return (
    <div className="min-h-screen bg-[#41C1CF] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[20px] border-2 border-black space-y-6 text-center">
        <h1 className="text-4xl font-bold text-black">404</h1>
        <h2 className="text-xl font-semibold text-gray-800">Page Not Found</h2>
        <p className="text-gray-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button 
          onClick={() => window.location.href = returnUrl}
          className="bg-[#3A53A3] hover:bg-[#2A437F] text-white"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NotFoundContent />
    </Suspense>
  );
}