'use client';

import { CsvGrid } from '@/components/csv-editor/csv-grid';
import { CsvHeader } from '@/components/csv-editor/csv-header';
import { AddRowDialog } from '@/components/csv-editor/add-row-dialog';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { CsvRow } from '@/components/csv-editor/types';

export default function Home() {
  const [data, setData] = useState<CsvRow[]>([]);
  const [hiddenFields, setHiddenFields] = useState<{[key: string]: boolean}>({
    fieldCode: false,
    empty: true
  });
  const csvGridRef = useRef<any>(null);

  const handleDataChange = (newData: CsvRow[]) => {
    setData(newData);
  };

  const handleAddRow = (fieldType: string) => {
    csvGridRef.current?.handleAddRow(fieldType);
  };

  const handleAddColumn = () => {
    csvGridRef.current?.handleAddColumn();
  };

  const handleSave = () => {
    csvGridRef.current?.handleSave();
  };

  const handleUpload = (file: File) => {
    csvGridRef.current?.handleUpload(file);
  };

  const handleDownload = () => {
    csvGridRef.current?.handleDownload();
  };

  const handleToggleVisibility = (field: string) => {
    setHiddenFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    csvGridRef.current?.handleToggleVisibility(field);
  };
 
  return (
    <div className="fieldmobi-container">
      <div className="flex h-screen">
        <main className="flex-1 flex flex-col">
          <div className="h-16 px-6 border-b-4 border-black bg-black flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-white text-xl font-bold border-r border-white/20 pr-6">Configuration Editor</div>
              <AddRowDialog onAddRow={handleAddRow} />
              <Button 
                onClick={handleSave}
                className="bg-[#3A53A3] hover:bg-[#2A437F] text-white border-2 border-black"
              >
                Save Changes
              </Button>
            </div>
            
          </div>
          <div className="flex-1 bg-[#41C1CF] overflow-auto p-6">
            
              <CsvGrid 
                ref={csvGridRef}
                onDataChange={handleDataChange} 
              />
            
          </div>
        </main>
      </div>
    </div>
  );
}