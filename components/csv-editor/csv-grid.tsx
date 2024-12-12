// csv-grid.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useVirtualizer} from '@tanstack/react-virtual';
import { CsvHeader } from './csv-header';
import { CsvCell } from './csv-cell';
import { debounce } from 'lodash';
import { 
  downloadCsv, 
  parseCsvLine, 
  parseCsvString, 
  transposeData, 
  untransposeData,
  type CsvRow 
} from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';

interface CsvGridProps {
  initialData?: CsvRow[];
}

interface ListTypeState {
  [fieldCode: string]: string;
}

export function CsvGrid({ initialData = [] }: CsvGridProps) {
  const { toast } = useToast();
  const [originalHeaders, setOriginalHeaders] = useState<string[]>(['Column 1']);
  const [hiddenFields, setHiddenFields] = useState<{[key: string]: boolean}>({
    "fieldCode": true,
    "empty": true
  });
  const [listTypes, setListTypes] = useState<{[key: string]: string}>({});
  const [fieldTypes, setFieldTypes] = useState<{[key: string]: string}>({});


  const [originalRows, setOriginalRows] = useState<CsvRow[]>(
    initialData.length > 0 ? initialData : [{
      id: '1',
      data: ['fieldCode001', '', 'DATA_FIELD_001', '', '', '', '', '', '', '', '', '', '', '']
    }]
  );

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

  const generateDataValue = (fieldCode: string) => {
    const number = fieldCode.replace('fieldCode', '');
    return `DATA_FIELD_${number}`;
  };

  const addRow = (fieldType: string) => {
    const newFieldCode = generateNextFieldCode();
    const newDataValue = generateDataValue(newFieldCode);
    
    const newRowData = new Array(Math.max(originalHeaders.length, 14)).fill('');
    newRowData[0] = newFieldCode;
    newRowData[1] = fieldType;
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

  const handleListTypeChange = (fieldCode: string, type: string) => {
    setListTypes(prev => ({ ...prev, [fieldCode]: type }));
    
    if (type === 'Codeset') {
      const rowIndex = originalRows.findIndex(row => row.data[0] === fieldCode);
      if (rowIndex !== -1) {
        const updatedRows = [...originalRows];
        const listValueIndex = originalHeaders.findIndex(header => 
          header.toLowerCase() === 'list_value'
        );
        if (listValueIndex !== -1) {
          updatedRows[rowIndex].data[listValueIndex] = '';
          setOriginalRows(updatedRows);
        }
      }
    }
  };

  const getListType = (fieldCode: string): string => {
    return listTypes[fieldCode] || '';
  };

  const getFieldType = (rowIndex: number, cellIndex: number): string => {
    const fieldTypeRow = visibleTransposedRows.find(row => 
      row.data[0]?.toLowerCase() === 'field_type'
    );
    return fieldTypeRow?.data[cellIndex] || '';
  };

  const getFieldCodeForCell = (rowIndex: number, cellIndex: number): string => {
    const fieldCodeRow = visibleTransposedRows.find(row => 
      row.data[0]?.toLowerCase() === 'field code'
    );
    return fieldCodeRow?.data[cellIndex] || '';
  };

  const getColumnHeader = (rowIndex: number): string => {
    const header = visibleTransposedRows[rowIndex]?.data[0]?.toLowerCase() || '';
    console.log(`Column header at row ${rowIndex}:`, header);
    return header;
  };
  

  const visibleTransposedRows = useMemo(() => {
    return transposeData(originalHeaders, originalRows, {
      hiddenFields,
      hideFieldCode: hiddenFields.fieldCode,
      hideEmpty: hiddenFields.empty
    });
  }, [originalHeaders, originalRows, hiddenFields]);

  const handleCellUpdate = useCallback((rowIndex: number, cellIndex: number, value: string) => {
    // Create deep copies to avoid reference issues
    const updatedTransposed = JSON.parse(JSON.stringify(visibleTransposedRows));
    updatedTransposed[rowIndex].data[cellIndex] = value;
  
    // Get metadata before untranspose
    const fieldCode = getFieldCodeForCell(rowIndex, cellIndex);
    const columnHeader = getColumnHeader(rowIndex);
    
    // Update special field types
    if (columnHeader === 'list_type' && fieldCode) {
      setListTypes(prev => ({ ...prev, [fieldCode]: value }));
    }
  
    if (columnHeader === 'field_type' && fieldCode) {
      setFieldTypes(prev => ({ ...prev, [fieldCode]: value }));
    }
  
    // Untranspose while preserving structure
    const { headers, rows } = untransposeData(updatedTransposed);
    
    // Preserve field codes and merge with new data
    const updatedRows = rows.map((row, idx) => ({
      id: originalRows[idx]?.id || `row-${idx}`,
      data: originalRows[idx] ? [
        // Keep original field code
        originalRows[idx].data[0],
        // Merge rest of the data
        ...row.data.slice(1)
      ] : row.data
    }));
  
    setOriginalHeaders(headers);
    setOriginalRows(updatedRows);
  }, [visibleTransposedRows, originalRows]);



  const toggleFieldVisibility = (field: string) => {
    setHiddenFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const updatedTransposed = [...visibleTransposedRows];
    updatedTransposed[rowIndex].data[cellIndex] = value;

    const fieldCode = getFieldCodeForCell(rowIndex, cellIndex);
    const columnHeader = getColumnHeader(rowIndex);
    if (columnHeader === 'list_type' && fieldCode) {
      handleListTypeChange(fieldCode, value);
    }
    
    const { headers, rows } = untransposeData(updatedTransposed);
    
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
          const headers = parseCsvLine(lines[0]);
          setOriginalHeaders(headers);
          
          const rows = parseCsvString(lines.slice(1).join('\n'));
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
                {visibleTransposedRows[0]?.data.map((_, index) => (
                  <th key={`header-${index}`} className="p-0 font-normal text-left">
                    <CsvCell 
                      value={index === 0 ? 'Field Name' : `Row ${index}`} 
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
                    <td 
                      key={`${row.id}-${cellIndex}`} 
                      className={`p-0 border-r last:border-r-0 ${cellIndex === 0 ? 'bg-gray-50' : ''}`}
                    >
                      <CsvCell
                        value={cell}
                        onChange={(value) => updateCell(rowIndex, cellIndex, value)}
                        rowType={row.data[0]?.toLowerCase()}
                        columnHeader={getColumnHeader(rowIndex)}
                        fieldType={getFieldType(rowIndex, cellIndex)}
                        fieldCode={getFieldCodeForCell(rowIndex, cellIndex)}
                        getListType={() => getListType(getFieldCodeForCell(rowIndex, cellIndex))}
                        onListTypeChange={(type) => handleListTypeChange(getFieldCodeForCell(rowIndex, cellIndex), type)}
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
