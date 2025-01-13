'use client';

import { useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnhancedCsvCell } from './csv-cell';
import { CsvPositionMapper } from './csv-position-mapper';
import { CsvRow, MappedCell, CsvGridProps } from './types';
import { downloadCsv, parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ListTypeState {
  [fieldCode: string]: {
    type: string;
    values: string[];
  };
}

export const CsvGrid = forwardRef<any, CsvGridProps>(({ initialData = [], onDataChange }, ref) => {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [headerRows, setHeaderRows] = useState<string[][]>([]);
  const [displayHeaders, setDisplayHeaders] = useState<string[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [originalRows, setOriginalRows] = useState<CsvRow[]>(initialData);
  const [transposedData, setTransposedData] = useState<MappedCell[][]>([]);
  const [listTypes, setListTypes] = useState<ListTypeState>({});

  const filterHiddenRows = useCallback((rows: MappedCell[][]) => {
    const hiddenValues = ['Link Setup', 'Update Setup', 'multi_group', 'hidden', 'visibility'];
    return rows
      .filter(row => {
        const firstCell = row[0]?.value.toLowerCase();
        return !hiddenValues.includes(firstCell) && row.some(cell => cell.value.trim() !== '');
      });
  }, []);

  const positionMapper = useMemo(() => {
    console.log('Creating new position mapper:', { rowCount: originalRows.length });
    const mapper = new CsvPositionMapper(originalRows, originalHeaders);
    const labelRow = originalRows[2]?.data || originalHeaders;
    setDisplayHeaders(labelRow);
    return mapper;
  }, [originalRows, originalHeaders]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const org_key = searchParams.get('org_key');
        const module_key = searchParams.get('module_key');
        
        if (!org_key || !module_key) throw new Error('Missing parameters');

        const response = await fetch(`/edit/api/load-config?org_key=${org_key}&module_key=${module_key}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Load failed');

        const { headers, rows, headerRows: parsedHeaders } = parseCsvString(data.csvContent);

        setOriginalHeaders(headers);
        setOriginalRows(rows);
        setHeaderRows(parsedHeaders);
        if (rows[3]) setDisplayHeaders(rows[3].data);

        // Process list types
        const loadedListTypes: ListTypeState = {};
        rows.forEach(row => {
          if (row.data[1] === 'CAT' && row.data[8]) {
            loadedListTypes[row.data[0]] = {
              type: row.data[8],
              values: row.data[9] ? row.data[9].split('#') : []
            };
          }
        });
        setListTypes(loadedListTypes);

        toast({
          title: "Configuration Loaded",
          description: `${rows.length} rows loaded successfully`
        });
      } catch (error) {
        console.error('Config load error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Load failed',
          variant: "destructive"
        });
      }
    };

    loadConfig();
  }, [searchParams, toast]);

  useEffect(() => {
    const mappedData = positionMapper.transposeWithMapping();
    console.log('Setting transposed data:', { rowCount: mappedData.length });
    setTransposedData(mappedData);
  }, [positionMapper]);

  // Inside csv-grid.tsx

  const handleCellUpdate = useCallback((
    filteredRow: number,
    filteredCol: number,
    newValue: string
  ) => {
    try {
      const mapping = positionMapper.getMapping(filteredRow, filteredCol);
      if (!mapping) throw new Error('Invalid mapping');
  
      const { updatedOriginal, updatedTransposed } = positionMapper.updateCell(
        filteredRow, 
        filteredCol,
        newValue
      );
  
      // Update Customization to CHANGE
      if (mapping.columnHeader.toLowerCase() !== 'customization') {
        const customizationIndex = updatedOriginal[0].data.findIndex(
          header => header.toLowerCase() === 'customization'
        );
        const rowIndex = mapping.original.row;
        
        if (customizationIndex !== -1 && updatedOriginal[rowIndex]) {
          updatedOriginal[rowIndex].data[customizationIndex] = 'CHANGE';
        }
      }
  
      setOriginalRows(updatedOriginal);
      setTransposedData(updatedTransposed);
  
      if (mapping) {
        // Handle special field types
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
  
        // Update display headers if needed
        if (mapping.original.row === 3) {
          setDisplayHeaders(updatedOriginal[3].data);
        }
      }
  
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update cell",
        variant: "destructive"
      });
    }
  }, [positionMapper, toast]);

  const handleSave = useCallback(async () => {
    try {
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      
      const response = await fetch(
        `/edit/api/save-config?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            csvContent: {
              headerRows,
              rows: originalRows,
              headers: originalHeaders
            }
          })
        }
      );

      if (!response.ok) throw new Error('Save failed');
      
      toast({ title: "Saved", description: "Configuration saved successfully" });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Save failed",
        variant: "destructive"
      });
    }
  }, [headerRows, originalRows, originalHeaders, searchParams, toast]);

  const handleAddRow = useCallback((fieldType: string, label: string) => {
    try {
      const { updatedOriginal, updatedTransposed, newFieldCode } = positionMapper.addRow(fieldType, label);
  
      const customizationIndex = updatedOriginal[0].data.findIndex(
        header => header.toLowerCase() === 'customization'
      );
      if (customizationIndex !== -1) {
        updatedOriginal[updatedOriginal.length - 1].data[customizationIndex] = 'NEW';
      }
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
        description: `Added new field: ${label}`
      });
    } catch (error) {
      toast({
        title: "Add Failed",
        description: error instanceof Error ? error.message : "Add failed", 
        variant: "destructive"
      });
    }
  }, [positionMapper, toast]);

  useImperativeHandle(ref, () => ({
    handleAddRow,
    handleSave
  }));

  return (
    <div className="w-full h-[calc(100vh-12rem)] flex flex-col bg-white shadow-sm">
      <ScrollArea className="flex-1 bg-white [&>div]:p-0 [&_.scrollbar]:ml-0">
        <div className="w-full h-full relative">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
              {originalRows.map((row, index) => {
                if (index === 1) return null;
                const header = row.data[3] || ''; // Add default empty string
                const uniqueId = `header-${index}-${row.data[0]}`;
                return (
                  <th 
                    key={`header-${index}`} 
                    className="sticky top-0 bg-[#1a1a1a] text-white font-medium text-left p-0 first:rounded-tl-lg z-30"
                  >
                    <EnhancedCsvCell
                      value={header}
                      isHeader={true}
                      forceReadOnly={true}
                      onChange={() => {}}
                      mapping={{
                        original: { row: index, col: 3 },
                        transposed: { row: 3, col: index },
                        fieldCode: row.data[0] || '',
                        columnHeader: (header || '').toLowerCase(), // Handle null/undefined
                        uniqueId
                      }}
                    />
                  </th>
                );
              })}
              </tr>
            </thead>
            <tbody>
              {filterHiddenRows(transposedData).map((row, rowIndex) => (
                <tr 
                  key={`row-${rowIndex}`}
                  className="group transition-colors hover:bg-gray-50/80"
                >
                  {row.map((cell, cellIndex) => {
                    // Get correct system row status from mapping
                    const mapping = positionMapper.getMapping(rowIndex, cellIndex);
                    const isSystemRow = mapping ? mapping.original.row <= 3 : false;
                    const isNumeric = mapping ? (
                      mapping.columnHeader.includes('cost') || 
                      mapping.columnHeader.includes('price')
                    ) : false;

                    return (
                      <td 
                        key={`cell-${rowIndex}-${cellIndex}`}
                        className={`
                          relative p-0 transition-colors
                          ${cellIndex === 0 ? 'sticky left-0 z-20 bg-[#3A53A3] text-white shadow-[1px_0_3px_-1px_rgba(0,0,0,0.15)] group-hover:bg-[#2A437F]' : 
                            isSystemRow ? 'bg-white group-hover:bg-gray-50/80' : ''}
                          ${isNumeric ? 'text-right' : ''}
                          ${rowIndex === 0 ? 'border-t border-gray-100' : ''}
                        `}
                      >
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
            <tfoot>
              <tr>
                {originalRows[0]?.data.map((_, index) => (
                  <td 
                    key={`footer-${index}`} 
                    className="h-2 bg-white sticky bottom-0 border-t border-gray-100"
                  />
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
});

CsvGrid.displayName = 'CsvGrid';


