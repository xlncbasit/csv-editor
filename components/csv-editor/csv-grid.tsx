'use client';

import { useState, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnhancedCsvCell } from './csv-cell';
import { CsvPositionMapper } from './csv-position-mapper';
import { CsvRow, MappedCell, CsvGridProps, CellMapping, Position } from './types';
import { downloadCsv, parseCsvString } from '@/lib/csv-utils';
import { useToast } from '@/hooks/use-toast';
import { useGroupSync } from '@/hooks/use-group-sync';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ListTypeState {
 [fieldCode: string]: {
   type: string;
   values: string[];
 };
}

interface UpdateOperation {
  type: 'cell' | 'row' | 'bulk';
  timestamp: number;
  data: {
    row?: number;
    col?: number;
    value?: string;
    fieldType?: string;
    label?: string;
    shouldSync?: boolean;
  };
 }

interface UpdateResult {
  updatedOriginal: CsvRow[];
  updatedTransposed: MappedCell[][];
  mapping?: CellMapping;
}

export const CsvGrid = forwardRef<any, CsvGridProps>(({ initialData = [], onDataChange }, ref) => {
 const { toast } = useToast();
 const searchParams = useSearchParams();
 const { syncWithGroup } = useGroupSync();
 
 const [headerRows, setHeaderRows] = useState<string[][]>([]);
 const [displayHeaders, setDisplayHeaders] = useState<string[]>([]);
 const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
 const [originalRows, setOriginalRows] = useState<CsvRow[]>(initialData);
 const [transposedData, setTransposedData] = useState<MappedCell[][]>([]);
 const [listTypes, setListTypes] = useState<ListTypeState>({});
 const [updating, setUpdating] = useState(false);
 const [updateQueue, setUpdateQueue] = useState<UpdateOperation[]>([]);

 const validateFieldType = useCallback((fieldType: string): boolean => {
  const validTypes = ['TAG', 'NAM', 'QTY', 'CAT', 'GEN', 'IMG', 'REM', 'TIM'];
  return validTypes.includes(fieldType);
}, []);

const validateLabel = useCallback((label: string): boolean => {
  return label.length > 0 && label.length <= 50 && /^[a-zA-Z0-9_\s-]+$/.test(label);
}, []);

const isDuplicateLabel = useCallback((label: string): boolean => {
  return originalRows.some(row => row.data[3].toLowerCase() === label.toLowerCase());
}, [originalRows]);

const handleListTypeUpdates = useCallback(async (
  mapping: CellMapping,
  newValue: string,
  rowIndex: number,
  updatedOriginal: CsvRow[]
 ) => {
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
 }, []);

 const handleDisplayHeaderUpdates = useCallback(async (
  mapping: CellMapping, 
  updatedOriginal: CsvRow[]
 ) => {
  if (mapping.original.row === 3) {
    setDisplayHeaders(updatedOriginal[3].data);
  }
 }, []);
 
 const handleGroupSync = useCallback(async (
  mapping: CellMapping | { fieldType: string; columnHeader: string; fieldCode: string },
  newValue: string,
  updatedOriginal: CsvRow[],
  rowIndex: number
 ) => {
  if (['label', 'list_type', 'list_value'].includes(mapping.columnHeader)) {
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    
    await syncWithGroup(
      org_key,
      module_key,
      JSON.stringify(updatedOriginal),
      {
        fieldType: mapping.fieldType || '',
        label: newValue,
        customization: 'CHANGE',
        dataValue: updatedOriginal[rowIndex].data[2]
      }
    );
  }
 }, [searchParams, syncWithGroup]);
 
 const filterHiddenRows = useCallback((rows: MappedCell[][]) => {
   const hiddenValues = ['Link Setup', 'Update Setup', 'multi_group', 'hidden', 'visibility'];
   return rows.filter(row => {
     const firstCell = row[0]?.value.toLowerCase();
     return !hiddenValues.includes(firstCell) && row.some(cell => cell.value.trim() !== '');
   });
 }, []);

 const processUpdateQueue = useCallback(async () => {
  if (updating || !updateQueue.length) return;
 
  setUpdating(true);
  try {
    const operation = updateQueue[0];
    if (operation.type === 'cell' && operation.data.row !== undefined && operation.data.col !== undefined && operation.data.value !== undefined) {
      await handleCellUpdate(operation.data.row, operation.data.col, operation.data.value);
    } else if (operation.type === 'row' && operation.data.fieldType && operation.data.label && operation.data.shouldSync !== undefined) {
      await handleAddRow(operation.data.fieldType, operation.data.label, operation.data.shouldSync);
    }
  } finally {
    setUpdating(false);
    setUpdateQueue(prev => prev.slice(1));
  }
 }, [updating, updateQueue]);
 
 useEffect(() => {
  processUpdateQueue();
 }, [updateQueue, processUpdateQueue]);

 const positionMapper = useMemo(() => {
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

       // Load list types from rows
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
   setTransposedData(mappedData);
 }, [positionMapper]);

 const handleCellUpdate = useCallback(async (
  filteredRow: number,
  filteredCol: number,
  newValue: string,
) => {
  if (!positionMapper.validatePosition(filteredRow, filteredCol)) {
    throw new Error('Invalid cell position');
  }

  if (updating) {
    setUpdateQueue(prev => [...prev, {
      type: 'cell',
      timestamp: Date.now(),
      data: { row: filteredRow, col: filteredCol, value: newValue }
    }]);
    return;
  }

  setUpdating(true);
  try {
    const result = await positionMapper.updateCell(
      filteredRow,
      filteredCol,
      newValue
    );

    if (result.mapping) {
      const rowIndex = result.updatedOriginal.findIndex(row => 
        row.data[0] === result.mapping?.fieldCode
      );

      if (rowIndex !== -1) {
        if (result.mapping.original.col !== 26) {
          result.updatedOriginal[rowIndex].data[26] = 'CHANGE';
        }

        await handleListTypeUpdates(result.mapping, newValue, rowIndex, result.updatedOriginal);
        await handleDisplayHeaderUpdates(result.mapping, result.updatedOriginal);
        await handleGroupSync(result.mapping, newValue, result.updatedOriginal, rowIndex);
      }
    }

    setOriginalRows(result.updatedOriginal);
    setTransposedData(result.updatedTransposed);
    onDataChange?.(result.updatedOriginal);

  } catch (error) {
    toast({
      title: "Update Failed",
      description: error instanceof Error ? error.message : "Failed to update cell",
      variant: "destructive"
    });
  } finally {
    setUpdating(false);
  }
}, [positionMapper, updating, handleListTypeUpdates, handleDisplayHeaderUpdates, handleGroupSync, onDataChange, toast]);

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

 const handleAddRow = useCallback(async (
  fieldType: string,
  label: string,
  shouldSync: boolean
) => {
  try {
    if (!validateFieldType(fieldType)) {
      throw new Error('Invalid field type');
    }

    if (!validateLabel(label)) {
      throw new Error('Invalid label format');
    }

    if (isDuplicateLabel(label)) {
      throw new Error('Label already exists');
    }

    const result = await positionMapper.addRow(fieldType, label);
    const newRowIndex = result.updatedOriginal.findIndex(row => 
      row.data[0] === result.newFieldCode
    );

    if (newRowIndex !== -1) {
      result.updatedOriginal[newRowIndex].data[26] = 'NEW';

      if (fieldType === 'CAT') {
        setListTypes(prev => ({
          ...prev,
          [result.newFieldCode]: { type: 'Fixed', values: [] }
        }));
      }

      if (shouldSync) {
        await handleGroupSync({
          fieldType,
          columnHeader: 'label',
          fieldCode: result.newFieldCode
        }, label, result.updatedOriginal, newRowIndex);
      }

      setOriginalRows(result.updatedOriginal);
      setTransposedData(result.updatedTransposed);
      onDataChange?.(result.updatedOriginal);

      toast({
        title: "Row Added",
        description: `New field code: ${result.newFieldCode}`
      });
    }
  } catch (error) {
    toast({
      title: "Add Failed",
      description: error instanceof Error ? error.message : "Add failed",
      variant: "destructive"
    });
  }
}, [positionMapper, validateFieldType, validateLabel, isDuplicateLabel, handleGroupSync, onDataChange, toast]);
  
  useImperativeHandle(ref, () => ({
   handleAddRow,
   handleSave
 }));

 return (
  <div className="w-full h-[calc(100vh-12rem)] flex flex-col bg-white shadow-sm">
    <ScrollArea className="flex-1 bg-white [&>div]:p-0 [&_.scrollbar]:ml-0">
      <div className="w-full h-full relative">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-40 bg-white">
            <tr>
              <th className="sticky left-0 top-0 z-50 bg-[#1a1a1a] text-white font-small text-left p-0 first:rounded-tl-lg">
                {originalRows[0] && (
                  <EnhancedCsvCell
                    value={originalRows[0].data[3]}
                    isHeader={true}
                    forceReadOnly={true}
                    onChange={() => {}}
                    mapping={{
                      original: { row: 0, col: 3 },
                      transposed: { row: 3, col: 0 },
                      fieldCode: originalRows[0].data[0] || '',
                      columnHeader: originalRows[0].data[3].toLowerCase(),
                      uniqueId: `header-0-${originalRows[0].data[0]}`
                    }}
                  />
                )}
              </th>
              {originalRows.slice(2).map((row, index) => (
                <th 
                  key={`header-${index + 1}`}
                  className="bg-[#1a1a1a] text-white font-medium text-left p-0"
                >
                  <EnhancedCsvCell
                    value={row.data[3]}
                    isHeader={true}
                    forceReadOnly={true}
                    onChange={() => {}}
                    mapping={{
                      original: { row: index + 1, col: 3 },
                      transposed: { row: 3, col: index + 1 },
                      fieldCode: row.data[0] || '',
                      columnHeader: row.data[3].toLowerCase(),
                      uniqueId: `header-${index + 1}-${row.data[0]}`
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filterHiddenRows(transposedData).map((row, rowIndex) => (
              <tr 
                key={`row-${rowIndex}`}
                className="group transition-colors hover:bg-gray-50/80"
              >
                <td className="sticky left-0 z-30 bg-[#3A53A3] text-white shadow-[1px_0_3px_-1px_rgba(0,0,0,0.15)] group-hover:bg-[#2A437F]">
                  <EnhancedCsvCell
                    value={row[0].value}
                    mapping={row[0].mapping}
                    onChange={(value) => handleCellUpdate(rowIndex, 0, value)}
                  />
                </td>
                {row.slice(1).map((cell, cellIndex) => (
                  <td 
                    key={`cell-${rowIndex}-${cellIndex + 1}`}
                    className={`
                      relative p-0 transition-colors
                      ${cellIndex === 0 ? 'border-l border-gray-200' : ''}
                      ${rowIndex === 0 ? 'border-t border-gray-100' : ''}
                    `}
                  >
                    <EnhancedCsvCell
                      value={cell.value}
                      mapping={cell.mapping}
                      onChange={(value) => handleCellUpdate(rowIndex, cellIndex + 1, value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  </div>
);
});

CsvGrid.displayName = 'CsvGrid';