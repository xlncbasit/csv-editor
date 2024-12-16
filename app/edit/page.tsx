'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CsvGrid } from '@/components/csv-editor/csv-grid';
import { parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CsvRow } from '@/components/csv-editor/types';
import { processCsvContent, handleCsvError } from '@/lib/csv-processor';

interface LoadConfigResponse {
  success: boolean;
  csvContent?: string;
  error?: string;
}

interface ListTypeState {
  [key: string]: {
    type: string;
    values: string[];
  };
}


const EditPage = () => {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<CsvRow[]>([]);
  const [listTypes, setListTypes] = useState<ListTypeState>({});
  const [hasChanges, setHasChanges] = useState(false);

  // edit/page.tsx
useEffect(() => {
  const loadConfig = async () => {
    try {
      const org_key = searchParams.get('org_key');
        const module_key = searchParams.get('module_key');

        console.log('Parameters:', { org_key, module_key }); // Debug parameters

        if (!org_key || !module_key) {
          throw new Error('Missing required parameters');
        }

      
        const response = await fetch(`/api/load-config?org_key=${org_key}&module_key=${module_key}`);
        const data: LoadConfigResponse = await response.json();

        console.log('API Response:', data);

        if (!data.success || !data.csvContent) {
          throw new Error(data.error || "Could not load configuration file");
        }

        const blob = new Blob([data.csvContent], { type: 'text/csv' });
        const file = new File([blob], 'config.csv', { type: 'text/csv' });
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const { headers, rows, headerRows } = parseCsvString(content);
          console.log('Parsed CSV:', { headers, rowCount: rows.length }); // Debug parsing

          const uploadedListTypes: ListTypeState = {};
          rows.forEach(row => {
            const fieldCode = row.data[0];
            const fieldType = row.data[1];
            const listType = row.data[8];
            const listValue = row.data[9];

            if (fieldType === 'CAT' && listType) {
              uploadedListTypes[fieldCode] = {
                type: listType,
                values: listValue ? listValue.split('#') : []
              };
            }
          });

          setInitialData(rows);
          setListTypes(uploadedListTypes);
        };
        
        reader.readAsText(file);

      } catch (error) {
        console.error('Loading error:', error);

        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load configuration",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [searchParams, toast]);


  const handleDataChange = () => {
    setHasChanges(true);
  };

  return (

    
    <main className=" bg-[#41C1CF]">
      <nav className="w-full bg-black shadow-sm py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">CSV Editor</h1>
          <div className="flex gap-4">
            <button 
              className={`
                text-black font-medium px-6 py-2 rounded-full border-2 border-black 
                transition-colors
                ${hasChanges 
                  ? 'bg-[#41C1CF] hover:bg-[#3A53A3] hover:text-white' 
                  : 'bg-gray-100 cursor-not-allowed'
                }
              `}
              onClick={() => {}} // Handle save functionality
              disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        </div>
      </nav>
      

      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-[20px] border-2 border-black">
            <h2 className="text-xl font-bold mb-4">Your Data</h2>
            <p className="text-sm text-gray-600 mb-6">
              Edit your CSV files with this interactive editor. Double-click cells to edit, add rows and columns, and download your changes.
            </p>
            
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : (
              <CsvGrid 
                initialData={initialData} 
                onDataChange={handleDataChange}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default EditPage;