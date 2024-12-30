'use client';

import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#41C1CF]">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#3A53A3]" />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-[#41C1CF] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 border-2 border-black space-y-4">
        <div className="flex items-center justify-center space-x-4">
          <Loader2 className="h-6 w-6 animate-spin text-black" />
          <div className="text-lg font-bold text-black">
            Loading Your Configuration...
          </div>
        </div>
        <div className="text-sm text-center text-gray-600">
          Please wait while we prepare your editor
        </div>
      </Card>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <div className="h-8 w-[200px] bg-gray-200 rounded animate-pulse" />
      <div className="h-[500px] w-full bg-gray-200 rounded animate-pulse" />
    </div>
  );
}