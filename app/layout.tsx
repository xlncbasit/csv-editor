import '@/app/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import Sidebar from '@/components/sidebar';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fieldmobi Editor',
  description: 'Interactive CSV editor for customization',
};

function LayoutSkeleton() {
  return (
    <div className="flex h-screen bg-[#41C1CF]">
      <div className="w-64 bg-[#3A53A3]" />
      <div className="flex-1 animate-pulse bg-gray-200" />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={<LayoutSkeleton />}>
          <div className="flex h-screen bg-[#41C1CF] overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}