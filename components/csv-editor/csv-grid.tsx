'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CsvHeader } from './csv-header';
import { EnhancedCsvCell } from './csv-cell';
import { CsvPositionMapper } from './csv-position-mapper';
import { CsvRow, MappedCell, CsvGridProps } from './types';
import { downloadCsv, parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';

interface ListTypeState {
  [fieldCode: string]: {
    type: string;
    values: string[];
  };
}

export function CsvGrid({ initialData = [], onDataChange }: CsvGridProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  // Your existing state declarations
  const [headerRows, setHeaderRows] = useState<string[][]>([]);
  const [displayHeaders, setDisplayHeaders] = useState<string[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [originalRows, setOriginalRows] = useState<CsvRow[]>(
    initialData.length > 0 
      ? initialData 
      : [{
          id: '1',
          data: ['fieldCode001', '', 'DATA_FIELD_001', '', '', '', '', '', '', '', '']
        }]
  );
  const [transposedData, setTransposedData] = useState<MappedCell[][]>([]);
  const [hiddenFields, setHiddenFields] = useState<{[key: string]: boolean}>({
    fieldCode: false,
    empty: true
  });
  const [listTypes, setListTypes] = useState<ListTypeState>({});
  const [fieldTypes, setFieldTypes] = useState<{[key: string]: string}>({});
  
  // Add auto-loading effect
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const org_key = searchParams.get('org_key');
        const module_key = searchParams.get('module_key');
        
        if (!org_key || !module_key) {
          throw new Error('Missing required parameters: org_key and module_key');
        }

        console.log('Loading config:', { org_key, module_key });

        const response = await fetch(`/edit/api/load-config?org_key=${org_key}&module_key=${module_key}`);
        const data = await response.json();

        if (!data.success || !data.csvContent) {
          throw new Error(data.error || 'Could not load configuration file');
        }

        // Parse the CSV content
        const { headers, rows, headerRows: parsedHeaderRows } = parseCsvString(data.csvContent);
        console.log('Parsed data:', { 
          headerCount: headers.length,
          rowCount: rows.length,
          headerRowCount: parsedHeaderRows.length 
        });

        // Update state with loaded data
        setOriginalHeaders(headers);
        setOriginalRows(rows);
        setHeaderRows(parsedHeaderRows);

        // Extract and set display headers
        if (rows[4]) {
          setDisplayHeaders(rows[4].data);
        }

        // Initialize list types from loaded data
        const loadedListTypes: ListTypeState = {};
        rows.forEach(row => {
          const fieldCode = row.data[0];
          const fieldType = row.data[1];
          const listType = row.data[8];
          const listValue = row.data[9];

          if (fieldType === 'CAT' && listType) {
            loadedListTypes[fieldCode] = {
              type: listType,
              values: listValue ? listValue.split('#') : []
            };
          }
        });
        setListTypes(loadedListTypes);

        toast({
          title: "Configuration Loaded",
          description: `Successfully loaded ${rows.length} rows of data`,
        });

      } catch (error) {
        console.error('Error loading config:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to load configuration',
          variant: "destructive",
        });
      }
    };

    loadConfig();
  }, [searchParams, toast]);

  // Your existing position mapper logic
  const positionMapper = useMemo(() => {
    console.log('Initializing position mapper:', {
      rowCount: originalRows.length,
      headerCount: originalHeaders.length
    });
    
    const mapper = new CsvPositionMapper(originalRows, originalHeaders);
    const labelRow = originalRows[4]?.data || originalHeaders;
    setDisplayHeaders(labelRow);

    return mapper;
  }, [originalRows, originalHeaders]);

  // Update transposed data when mapper changes
  useEffect(() => {
    const mappedTransposed = positionMapper.transposeWithMapping();
    console.log('Generated transposed data:', {
      rowCount: mappedTransposed.length,
      colCount: mappedTransposed[0]?.length || 0
    });
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

      const mapping = positionMapper.getMappingForTransposedPosition(transposedRow, transposedCol);
      
      if (mapping) {
        if (mapping.columnHeader === 'list_type' && mapping.fieldType === 'CAT') {
          setListTypes(prev => ({
            ...prev,
            [mapping.fieldCode]: {
              type: newValue,
              values: prev[mapping.fieldCode]?.values || []
            }
          }));
        }
        
        if (mapping.columnHeader === 'list_value' && mapping.fieldType === 'CAT') {
          setListTypes(prev => ({
            ...prev,
            [mapping.fieldCode]: {
              type: prev[mapping.fieldCode]?.type || 'Fixed',
              values: newValue.split('#')
            }
          }));
        }

        if (mapping.columnHeader === 'field_type') {
          setFieldTypes(prev => ({ ...prev, [mapping.fieldCode]: newValue }));
          
          // Reset list type data if field type changes from CAT
          if (newValue !== 'CAT') {
            setListTypes(prev => {
              const updated = { ...prev };
              delete updated[mapping.fieldCode];
              return updated;
            });
          }
        }
      }

      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);
      
      if (mapping?.original.row === 3) {
        setDisplayHeaders(updatedOriginal[3].data);
      }
    } catch (error) {
      toast({
        title: "Error Updating Cell",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [positionMapper, toast]);

  // Rest of the handlers remain the same
  const handleAddRow = useCallback((fieldType: string) => {
    try {
      const { updatedOriginal, updatedTransposed, newFieldCode } = 
        positionMapper.addRow(fieldType);

      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);

      if (fieldType === 'CAT') {
        setListTypes(prev => ({
          ...prev,
          [newFieldCode]: { type: 'Fixed', values: [] }
        }));
      }

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

      setOriginalHeaders(updatedHeaders);
      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);
      setDisplayHeaders(prev => [...prev, `Column ${prev.length + 1}`]);

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

  // Existing handlers remain the same
  const handleDownload = () => {
    try {
      const dataForDownload = originalRows.map(row => ({
        ...row,
        data: row.data.map(cell => cell || '')
      }));
      downloadCsv(dataForDownload, originalHeaders, headerRows);
      
      toast({
        title: "Download Started",
        description: "Your CSV file is being downloaded"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const { headers, rows, headerRows: parsedHeaderRows } = parseCsvString(content);
        
        setOriginalHeaders(headers);
        setOriginalRows(rows);
        setHeaderRows(parsedHeaderRows);
        
        if (rows[3]) {
          setDisplayHeaders(rows[3].data);
        }
        
        // Initialize list types from uploaded data
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
        setListTypes(uploadedListTypes);
        
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

  const toggleFieldVisibility = (field: string) => {
    setHiddenFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
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
            <tr className="border-b bg-black text-white">
              {originalRows.map((row, index) => {
                const header = row.data[3]; // Extract the 4th column (index 3) from each row
                return (
                  <th key={`header-${index}`} className="p-0 font-normal text-left">
                    <EnhancedCsvCell
                      value={header}
                      isHeader
                      onChange={() => {}}
                      mapping={{
                        original: { row: index, col: 3 },
                        transposed: { row: index, col: 0 },
                        fieldCode: row.data[0] || '',
                        columnHeader: header.toLowerCase()
                      }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

            <tbody>
              {transposedData.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => {
                    const metadata = positionMapper.getCellMetadata(cell.mapping.fieldCode);
                    return (
                      <td key={`cell-${rowIndex}-${cellIndex}`} className="p-0">
                        <EnhancedCsvCell
                          value={cell.value}
                          mapping={cell.mapping}
                          onChange={(value) => handleCellUpdate(rowIndex, cellIndex, value)}
                          listTypes={listTypes}
                          onListTypeChange={(fieldCode, type) => {
                            setListTypes(prev => ({
                              ...prev,
                              [fieldCode]: {
                                type,
                                values: prev[fieldCode]?.values || []
                              }
                            }));
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}