'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CsvGrid } from '@/components/csv-editor/csv-grid';
import { parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';
import { LoadingPage, PageSkeleton } from '@/components/loading-page';
import { CsvRow } from '@/components/csv-editor/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

interface LoadConfigResponse {
  success: boolean;
  csvContent?: string;
  error?: string;
}

function EditPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<CsvRow[]>([]);

  useEffect(() => {
    const loadConfig = async () => {
      console.log('Starting loadConfig...');
      try {
        const org_key = searchParams.get('org_key');
        const module_key = searchParams.get('module_key');
        console.log('Parameters:', { org_key, module_key });

        if (!org_key || !module_key) {
          throw new Error('Missing required parameters');
        }
        console.log('Initiating fetch request...');

        const response = await fetch(`/api/load-config?org_key=${org_key}&module_key=${module_key}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );
        console.log('Response received:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Parsing response...');
        const data: LoadConfigResponse = await response.json();
        console.log('Data received:', { success: data.success, hasContent: !!data.csvContent });
        console.log('Fetching from API:', `/api/load-config?org_key=${org_key}&module_key=${module_key}`);


        if (!data.success || !data.csvContent) {
          throw new Error(data.error || 'Could not load configuration file');
        }

        const { rows } = parseCsvString(data.csvContent);
        setInitialData(rows);

        toast({
          title: "Configuration Loaded",
          description: `Successfully loaded ${rows.length} rows of data`,
        });
      } catch (error) {
        console.error('Load config error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [searchParams, toast]);

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <main className="bg-[#41C1CF]">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-[20px] border-2 border-black">
            <h2 className="text-xl font-bold mb-4">Configuration Editor</h2>
            <p className="text-sm text-gray-600 mb-6">
              Edit your CSV files with this interactive editor. Double-click cells to edit, add rows and columns, and download your changes.
            </p>
            <CsvGrid 
              initialData={initialData} 
              onDataChange={(newData) => {
                // Handle data changes
                console.log('Data changed:', newData);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <EditPageContent />
    </Suspense>
  );
}