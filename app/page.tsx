'use client';

import { CsvGrid } from '@/components/csv-editor/csv-grid';

function MainContent() {
  const handleDataChange = (newData: any[]) => {
    console.log('Data changed:', newData);
    // Add any data change handling logic here
  };

  return (
    <div className="flex-1">
      <CsvGrid onDataChange={handleDataChange} />
    </div>
  );
}

export default function Home() {
  return <MainContent />;
}