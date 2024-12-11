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
import { useToast } from '@/hooks/use-toast';

interface TransposeOptions {
  hideFieldCode?: boolean;
  hideEmpty?: boolean;
  hiddenFields?: {[key: string]: boolean};
}

interface CsvGridProps {
  initialData?: CsvRow[];
}

export function CsvGrid({ initialData = [] }: CsvGridProps) {
  const { toast } = useToast();
  const [originalHeaders, setOriginalHeaders] = useState<string[]>(['Column 1']);
  const [hiddenFields, setHiddenFields] = useState<{[key: string]: boolean}>({
    "fieldCode": true,
    "empty": true
  });

  const [originalRows, setOriginalRows] = useState<CsvRow[]>(
    initialData.length > 0 ? initialData : [{
      id: '1',
      data: ['fieldCode001', '', 'DATA_FIELD_001', '', '', '', '', '', '', '', '', '', '', '']
    }]
  );

  // Helper function to generate next field code
  const generateNextFieldCode = () => {
    const existingFieldCodes = originalRows.map(row => row.data[0])
      .filter(code => code?.startsWith('fieldCode'))
      .map(code => {
        const numStr = code?.replace('fieldCode', '');
        return numStr ? parseInt(numStr, 10) : 0;
      });
    
    const maxNumber = Math.max(0, ...existingFieldCodes);
    const nextNumber = maxNumber + 1;
    return `fieldCode${String(nextNumber).padStart(3, '0')}`;
  };

  // Helper function to generate unique data value
  const generateDataValue = (fieldCode: string) => {
    const number = fieldCode.replace('fieldCode', '');
    return `DATA_FIELD_${number}`;
  };

  // In csv-grid.tsx

  // In csv-grid.tsx
const addRow = (fieldType: string) => {
    const newFieldCode = generateNextFieldCode();
    const newDataValue = generateDataValue(newFieldCode);
    
    const newRowData = new Array(Math.max(originalHeaders.length, 14)).fill('');
    newRowData[0] = newFieldCode;
    newRowData[1] = fieldType;      // Now uses the selected field type
    newRowData[2] = newDataValue;
    
    setOriginalRows(current => [
      ...current,
      {
        id: `row-${current.length + 1}`,
        data: newRowData,
      },
    ]);

    toast({
      title: "Row Added",
      description: `Added new row with field code ${newFieldCode} and type ${fieldType}`,
    });
  };

  const visibleTransposedRows = transposeData(originalHeaders, originalRows, {
    hiddenFields,
    hideFieldCode: hiddenFields.fieldCode,
    hideEmpty: hiddenFields.empty
  });

  const toggleFieldVisibility = (field: string) => {
    setHiddenFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const updatedTransposed = [...visibleTransposedRows];
    updatedTransposed[rowIndex].data[cellIndex] = value;
    
    const { headers, rows } = untransposeData(updatedTransposed);
    
    // Preserve hidden fields when updating
    const updatedRows = rows.map((row, idx) => ({
      ...row,
      data: originalRows[idx] ? [
        hiddenFields.fieldCode ? originalRows[idx].data[0] : row.data[0],
        ...row.data.slice(1)
      ] : row.data
    }));

    setOriginalHeaders(headers);
    setOriginalRows(updatedRows);
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

    toast({
      title: "Column Added",
      description: `Added new column "${newHeader}"`,
    });
  };

  const handleDownload = () => {
    try {
      downloadCsv(originalRows, originalHeaders);
      toast({
        title: "Download Started",
        description: "Your CSV file is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading your CSV file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (file: File) => {
    try {
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

          toast({
            title: "File Uploaded",
            description: `Successfully loaded ${rows.length} rows of data`,
          });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your CSV file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <CsvHeader
        onAddColumn={addColumn}
        onAddRow={addRow}
        onDownload={handleDownload}
        onUpload={handleUpload}
        hiddenFields={hiddenFields}
        onToggleVisibility={toggleFieldVisibility}
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
            {visibleTransposedRows.map((row, rowIndex) => (
              <tr key={row.id} className="border-b last:border-b-0">
                {row.data.map((cell, cellIndex) => (
                  <td key={`${row.id}-${cellIndex}`} className="p-0 border-r last:border-r-0">
                    <CsvCell
                      value={cell}
                      onChange={(value) => updateCell(rowIndex, cellIndex, value)}
                      // Pass the row type based on the first cell in the row
                      rowType={row.data[0]?.toLowerCase()}
                      columnHeader={visibleTransposedRows[rowIndex]?.data[0]}
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








