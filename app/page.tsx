'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CsvGrid } from '@/components/csv-editor/csv-grid';
import { parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CsvRow } from '@/components/csv-editor/types';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export default function ConfigEditorPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: null
  });
  const [csvData, setCsvData] = useState<CsvRow[]>([]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const org_key = searchParams.get('org_key');
        const module_key = searchParams.get('module_key');

        if (!org_key || !module_key) {
          throw new Error('Missing required URL parameters: org_key and module_key');
        }

        const response = await fetch(`/api/load-config?org_key=${org_key}&module_key=${module_key}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load configuration');
        }

        const { headers, rows } = parseCsvString(data.csvContent);
        setCsvData(rows);

        toast({
          title: "Configuration Loaded",
          description: `Successfully loaded ${rows.length} rows of data`,
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        setLoadingState(prev => ({ ...prev, error: message }));
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoadingState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadConfig();
  }, [searchParams, toast]);

  if (loadingState.isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (loadingState.error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>
            {loadingState.error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8">
      <CsvGrid 
        initialData={csvData}
        onDataChange={(newData) => {
          setCsvData(newData);
        }}
      />
    </div>
  );
}