import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function LoadingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState('');

  // Animate the loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Handle the delayed redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const org_key = params.get('org_key');
      const module_key = params.get('module_key');

      if (!org_key || !module_key) {
        setError('Missing required parameters');
        return;
      }

      // Redirect to edit page with parameters
      router.push(`/edit?org_key=${org_key}&module_key=${module_key}`);
    }, 2000);

    return () => clearInterval(timer);
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#41C1CF] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 border-2 border-black space-y-4">
          <div className="text-lg font-bold text-red-600">Error</div>
          <div className="text-gray-600">{error}</div>
          <div className="text-sm text-gray-500">
            Please ensure you have the correct URL parameters.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#41C1CF] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 border-2 border-black space-y-4">
        <div className="flex items-center justify-center space-x-4">
          <Loader2 className="h-6 w-6 animate-spin text-black" />
          <div className="text-lg font-bold text-black">
            Preparing Your Editor{dots}
          </div>
        </div>
        <div className="text-sm text-center text-gray-600">
          Loading your configuration file
        </div>
      </Card>
    </div>
  );
}