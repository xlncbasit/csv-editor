'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { CsvHeader } from './csv-header';
import { CsvCell } from './csv-cell';
import { CsvPositionMapper } from './csv-position-mapper';
import { CsvRow, MappedCell } from './types';
import { debounce } from 'lodash';
import { downloadCsv, parseCsvLine, parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';

export function CsvGrid({ initialData = [] }: { initialData?: CsvRow[] }) {
  const { toast } = useToast();
  const [headerRows, setHeaderRows] = useState<string[][]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>(['Column 1']);
  const [originalRows, setOriginalRows] = useState<CsvRow[]>(
    initialData.length > 0 ? initialData : [{
      id: '1',
      data: ['fieldCode001', '', 'DATA_FIELD_001', '', '', '', '', '', '', '', '', '', '', '']
    }]
  );
  const [transposedData, setTransposedData] = useState<MappedCell[][]>([]);
  const [hiddenFields, setHiddenFields] = useState<{[key: string]: boolean}>({
    fieldCode: true,
    empty: true
  });
  const [listTypes, setListTypes] = useState<{[key: string]: string}>({});
  const [fieldTypes, setFieldTypes] = useState<{[key: string]: string}>({});

  // Initialize position mapper
  const positionMapper = useMemo(() => 
    new CsvPositionMapper(originalRows, originalHeaders),
    [originalRows, originalHeaders]
  );

  // Initialize transposed data
  useEffect(() => {
    const mappedTransposed = positionMapper.transposeWithMapping();
    setTransposedData(mappedTransposed);
  }, [positionMapper]);

  const handleCellUpdate = useCallback((
    transposedRow: number,
    transposedCol: number,
    newValue: string
  ) => {
    try {
      const { updatedOriginal, updatedTransposed } = positionMapper.updateCell(
        transposedRow,
        transposedCol,
        newValue
      );

      // Get mapping for updated cell
      const mapping = positionMapper.getMappingForTransposedPosition(transposedRow, transposedCol);
      
      if (mapping) {
        // Handle special field updates
        if (mapping.columnHeader === 'list_type') {
          setListTypes(prev => ({ ...prev, [mapping.fieldCode]: newValue }));
        }
        if (mapping.columnHeader === 'field_type') {
          setFieldTypes(prev => ({ ...prev, [mapping.fieldCode]: newValue }));
        }
      }

      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);
    } catch (error) {
      toast({
        title: "Error Updating Cell",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [positionMapper, toast]);

  const handleAddRow = useCallback((fieldType: string) => {
    try {
      const { updatedOriginal, updatedTransposed, newFieldCode } = 
        positionMapper.addRow(fieldType);

      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);

      toast({
        title: "Row Added",
        description: `Added new row with field code ${newFieldCode}`,
      });
    } catch (error) {
      toast({
        title: "Error Adding Row",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [positionMapper, toast]);

  const handleAddColumn = useCallback(() => {
    try {
      const { updatedOriginal, updatedTransposed, updatedHeaders } = 
        positionMapper.addColumn();

      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);
      setOriginalHeaders(updatedHeaders);

      toast({
        title: "Column Added",
        description: "Added new column successfully",
      });
    } catch (error) {
      toast({
        title: "Error Adding Column",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [positionMapper, toast]);

  const toggleFieldVisibility = (field: string) => {
    setHiddenFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleDownload = () => {
    try {
      downloadCsv(originalRows, originalHeaders, headerRows);
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
        const { headers, rows, headerRows } = parseCsvString(content);
        
        setOriginalHeaders(headers);
        setOriginalRows(rows);
        setHeaderRows(headerRows);
        
        toast({
          title: "File Uploaded",
          description: `Successfully loaded ${rows.length} rows of data`,
        });
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
        onAddColumn={handleAddColumn}
        onAddRow={handleAddRow}
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
                {transposedData[0]?.map((cell, index) => (
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
              {transposedData.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={`cell-${rowIndex}-${cellIndex}`} 
                      className={`p-0 border-r last:border-r-0 ${cellIndex === 0 ? 'bg-gray-50' : ''}`}
                    >
                      <CsvCell
                        value={cell.value}
                        onChange={(value) => handleCellUpdate(rowIndex, cellIndex, value)}
                        rowType={cell.mapping.columnHeader}
                        columnHeader={cell.mapping.columnHeader}
                        fieldType={fieldTypes[cell.mapping.fieldCode]}
                        fieldCode={cell.mapping.fieldCode}
                        getListType={() => listTypes[cell.mapping.fieldCode]}
                        onListTypeChange={(type) => {
                          setListTypes(prev => ({
                            ...prev,
                            [cell.mapping.fieldCode]: type
                          }));
                        }}
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