'use client';

import { useState } from 'react';
import { CsvHeader } from './csv-header';
import { CsvCell } from './csv-cell';
import { 
  downloadCsv, 
  parseCsvString, 
  transposeData, 
  untransposeData,
  type CsvRow 
} from '@/lib/csv-utils';

interface CsvGridProps {
  initialData?: CsvRow[];
}

export function CsvGrid({ initialData = [] }: CsvGridProps) {
  const [originalHeaders, setOriginalHeaders] = useState<string[]>(['Column 1']);
  const [originalRows, setOriginalRows] = useState<CsvRow[]>(
    initialData.length > 0 ? initialData : [{ id: '1', data: [''] }]
  );
  
  // Display data in transposed format
  const transposedRows = transposeData(originalHeaders, originalRows);

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const updatedTransposed = [...transposedRows];
    updatedTransposed[rowIndex].data[cellIndex] = value;
    
    // Convert back to original format to update state
    const { headers, rows } = untransposeData(updatedTransposed);
    setOriginalHeaders(headers);
    setOriginalRows(rows);
  };

  const addRow = () => {
    setOriginalRows(current => [
      ...current,
      {
        id: `row-${current.length + 1}`,
        data: Array(originalHeaders.length).fill(''),
      },
    ]);
  };

  const addColumn = () => {
    const newHeader = `Column ${originalHeaders.length + 1}`;
    setOriginalHeaders(current => [...current, newHeader]);
    setOriginalRows(current =>
      current.map(row => ({
        ...row,
        data: [...row.data, ''],
      }))
    );
  };

  const handleDownload = () => {
    downloadCsv(originalRows, originalHeaders);
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(header => header.trim());
        setOriginalHeaders(headers);
        
        const rows = lines.slice(1).map((line, index) => ({
          id: `row-${index}`,
          data: line.split(',').map(cell => cell.trim()),
        }));
        setOriginalRows(rows);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <CsvHeader
        onAddColumn={addColumn}
        onAddRow={addRow}
        onDownload={handleDownload}
        onUpload={handleUpload}
      />
      
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-0 font-normal text-left">
                  <CsvCell
                    value="Headers"
                    isHeader
                    onChange={() => {}}
                  />
                </th>
                {Array.from({ length: originalRows.length + 1 }).map((_, index) => (
                  <th key={`header-${index}`} className="p-0 font-normal text-left">
                    <CsvCell
                      value={index === 0 ? 'Values' : `Row ${index}`}
                      isHeader
                      onChange={() => {}}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transposedRows.map((row, rowIndex) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  {row.data.map((cell, cellIndex) => (
                    <td key={`${row.id}-${cellIndex}`} className="p-0 border-r last:border-r-0">
                      <CsvCell
                        value={cell}
                        onChange={(value) => updateCell(rowIndex, cellIndex, value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}